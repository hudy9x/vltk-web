mod control;
mod diagnostics;
#[path = "../../domain/mod.rs"]
mod domain;
mod protocol;
mod pve_protocol;
mod world;
use anyhow::{Result, ensure};
use axum::{Json, Router, routing::get};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tokio::{
    sync::{Semaphore, watch},
    time::timeout,
};
use world::World;
use wtransport::{Connection, Endpoint, Identity, ServerConfig};

fn authenticate(ticket: &[u8], secret: &[u8]) -> Result<([u8; 16], [u8; 16], u32)> {
    ensure!(ticket.len() == 69 && ticket[0] == 1, "invalid ticket");
    let mut mac = Hmac::<Sha256>::new_from_slice(secret)?;
    mac.update(&ticket[..37]);
    mac.verify_slice(&ticket[37..])?;
    let expiry = protocol::u32_at(ticket, 1);
    let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();
    ensure!(
        (expiry as u64) >= now && (expiry as u64) <= now + 35,
        "expired ticket"
    );
    Ok((
        ticket[5..21].try_into()?,
        ticket[21..37].try_into()?,
        expiry,
    ))
}
async fn read_uni(connection: &Connection) -> Result<Vec<u8>> {
    let mut stream = connection.accept_uni().await?;
    timeout(Duration::from_secs(3), async {
        let mut bytes = Vec::new();
        let mut buffer = [0u8; 256];
        while let Some(length) = stream.read(&mut buffer).await? {
            ensure!(bytes.len() + length <= 256, "control packet too large");
            bytes.extend_from_slice(&buffer[..length]);
        }
        anyhow::Ok(bytes)
    })
    .await?
}
async fn reliable(connection: &Connection, bytes: &[u8]) -> Result<()> {
    timeout(Duration::from_secs(2), async {
        let mut stream = connection.open_uni().await?.await?;
        stream.write_all(bytes).await?;
        stream.finish().await?;
        anyhow::Ok(())
    })
    .await??;
    Ok(())
}
async fn play(
    connection: &Connection,
    world: &Mutex<World>,
    id: u32,
    mut ticks: watch::Receiver<u32>,
) -> Result<()> {
    let mut revision = None;
    let mut debug_last_event=0u32;
    let mut last = Instant::now();
    let mut budget_start = Instant::now();
    let mut budget = 0;
    let control = read_uni(connection);
    tokio::pin!(control);
    loop {
        tokio::select! {
            datagram = connection.receive_datagram() => {
                let bytes = datagram?;
                if budget_start.elapsed() >= Duration::from_secs(1) { budget = 0; budget_start = Instant::now(); }
                budget += 1; ensure!(budget <= 60, "input rate exceeded");
                world.lock().unwrap().update(id, protocol::position(&bytes)?)?;
                last = Instant::now();
            }
            changed = ticks.changed() => {
                changed?;
                ensure!(last.elapsed() < Duration::from_secs(12), "input timeout");
                let tick = *ticks.borrow_and_update();
                let packet = { let state = world.lock().unwrap(); (state.revision, state.packets(id,tick,revision != Some(state.revision))) };
                if let Some((snapshot, roster)) = packet.1 {
                    if let Some(roster) = roster { reliable(connection, &roster).await?; revision = Some(packet.0); }
                    connection.send_datagram(snapshot)?;
                    if tick.is_multiple_of(2) {
                        let (state,events)={let w=world.lock().unwrap();
                            let map=w.game.actors.get(&id).map(|a|a.map);
                            let events=if diagnostics::enabled(){w.game.events.iter().filter(|e|Some(e.map)==map&&(e.id.wrapping_sub(debug_last_event) as i32)>0).map(|e|serde_json::json!({"event":e.id,"skill":e.skill,"kind":e.kind,"source":e.source,"target":e.target})).collect::<Vec<_>>()}else{vec![]};
                            (pve_protocol::snapshot(&w.game,id),events)};
                        if let Some(bytes)=state{reliable(connection,&bytes).await?;
                            if !events.is_empty(){debug_last_event=events.last().and_then(|e|e["event"].as_u64()).unwrap_or(debug_last_event as u64) as u32;diagnostics::log("world-sent",serde_json::json!({"player":id,"tick":tick,"bytes":bytes.len(),"events":events}));}
                        }
                    }
                }
            }
            packet = &mut control => {
                // Count bursts rather than spacing: QUIC can deliver delayed streams together.
                if budget_start.elapsed() >= Duration::from_secs(1) { budget = 0; budget_start = Instant::now(); }
                budget += 1; ensure!(budget <= 60, "input rate exceeded");
                let bytes = packet?;
                {let mut state = world.lock().unwrap();
                if bytes.get(1)==Some(&16){let c=pve_protocol::command(&bytes)?;
                    if diagnostics::enabled(){let actor=state.game.actors.get(&id);diagnostics::log("command",serde_json::json!({"player":id,"seq":c.seq,"kind":c.kind,"map":c.map,"skill":c.skill,"target":c.target,
                        "slot":actor.map(|a|a.slot),"learned":actor.map(|a|a.profile.skills.iter().any(|s|s.id==c.skill))}));}
                    state.game.command(id,c)?;}
                else {let (appearance, _) = protocol::appearance(&bytes, false)?;state.players.get_mut(&id).unwrap().appearance=appearance;state.revision=state.revision.wrapping_add(1);}}

                control.set(read_uni(connection));
            }
            stream = connection.accept_bi() => { stream?; anyhow::bail!("unexpected bidirectional stream"); }
        }
    }
}

#[tokio::main(worker_threads = 2)]
async fn main() -> Result<()> {
    let secret = std::env::var("MULTIPLAYER_SECRET")?;
    ensure!(
        secret.len() >= 32,
        "MULTIPLAYER_SECRET must contain at least 32 characters"
    );
    let public_host = std::env::var("WT_CERT_HOST").unwrap_or_else(|_| "127.0.0.1".into());
    let identity = Identity::self_signed(["localhost", "127.0.0.1", public_host.as_str()])?;
    let hash = identity.certificate_chain().as_slice()[0]
        .hash()
        .as_ref()
        .to_vec();
    let quic_bind = std::env::var("WT_BIND").unwrap_or_else(|_| "127.0.0.1:4434".into());
    let endpoint = Endpoint::server(
        ServerConfig::builder()
            .with_bind_address(quic_bind.parse()?)
            .with_identity(identity)
            .keep_alive_interval(Some(Duration::from_secs(2)))
            .max_idle_timeout(Some(Duration::from_secs(15)))?
            .build(),
    )?;
    let play_url =
        std::env::var("WT_PUBLIC_URL").unwrap_or_else(|_| "https://127.0.0.1:4434/play".into());
    let config = serde_json::json!({"protocol":crate::protocol::VERSION,"diagnostics":{"revision":diagnostics::REVISION,"enabled":diagnostics::enabled()},"playUrl":play_url,"certificateHash":hash});
    let world = Arc::new(Mutex::new(World::default()));
    let app = Router::new()
        .merge(control::routes(world.clone(), secret.clone()))
        .route(
            "/config",
            get(move || {
                let config = config.clone();
                async move { Json(config) }
            }),
        )
        .route("/health", get(|| async { "ok" }));
    let http_bind = std::env::var("WT_HTTP_BIND").unwrap_or_else(|_| "127.0.0.1:3104".into());
    let listener = tokio::net::TcpListener::bind(&http_bind).await?;
    tokio::spawn(async move {
        if let Err(error) = axum::serve(listener, app).await {
            eprintln!("HTTP: {error}");
        }
    });
    let origins = Arc::new(
        std::env::var("WT_ORIGINS")
            .unwrap_or_else(|_| "http://localhost:3000,http://127.0.0.1:3000".into()),
    );
    let used = Arc::new(Mutex::new(HashMap::<[u8; 16], u32>::new()));
    let capacity = Arc::new(Semaphore::new(128));
    let (ticks, tick_rx) = watch::channel(0u32);
    let simulation = world.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_millis(50));
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
        let mut tick = 0u32;
        loop {
            interval.tick().await;
            simulation.lock().unwrap().game.step();
            tick = tick.wrapping_add(1);
            if ticks.send(tick).is_err() {
                break;
            }
        }
    });
    diagnostics::log("boot",serde_json::json!({"protocol":protocol::VERSION,"http":http_bind.to_string(),"quic":quic_bind.to_string()}));
    println!("Game multiplayer WebTransport: control {http_bind}, QUIC {quic_bind}");
    loop {
        let incoming = tokio::select! {v=endpoint.accept()=>v, _=tokio::signal::ctrl_c()=>break};
        let Ok(permit) = capacity.clone().try_acquire_owned() else {
            drop(incoming);
            continue;
        };
        let (world, used, origins, secret, ticks) = (
            world.clone(),
            used.clone(),
            origins.clone(),
            secret.clone(),
            tick_rx.clone(),
        );
        tokio::spawn(async move {
            let _permit = permit;
            let result = async {
                let request = timeout(Duration::from_secs(4), incoming).await??;
                if request.path() != "/play" {
                    request.not_found().await;
                    return Ok(());
                }
                if !request.origin().is_some_and(|origin| {
                    origins.split(',').any(|allowed| allowed.trim() == origin)
                }) {
                    request.forbidden().await;
                    return Ok(());
                }
                let connection = timeout(Duration::from_secs(4), request.accept()).await??;
                let join = async {
                    let bytes = timeout(Duration::from_secs(4), read_uni(&connection)).await??;
                    let (appearance, ticket) = protocol::appearance(&bytes, true)?;
                    let (account, nonce, expiry) = authenticate(ticket, secret.as_bytes())?;
                    {
                        let now = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs() as u32;
                        let mut used = used.lock().unwrap();
                        used.retain(|_, v| *v >= now);
                        ensure!(
                            used.len() < 4096 && !used.contains_key(&nonce),
                            "ticket replay"
                        );
                        used.insert(nonce, expiry);
                    }
                    let mut state = world.lock().unwrap();
                    let key = nonce.iter().map(|b| format!("{b:02x}")).collect::<String>();
                    let (admission, at) = state
                        .admissions
                        .remove(&key)
                        .ok_or_else(|| anyhow::anyhow!("missing character admission"))?;
                    ensure!(
                        at.elapsed().as_secs() < 30
                            && admission.account.replace('-', "")
                                == account
                                    .iter()
                                    .map(|b| format!("{b:02x}"))
                                    .collect::<String>(),
                        "admission mismatch"
                    );
                    let id = state.join(account, appearance)?;
                    if let Err(error) =
                        state
                            .game
                            .join(id, admission.account, admission.slot, admission.profile)
                    {
                        state.leave(id);
                        return Err(error);
                    }
                    state.game.actors.get_mut(&id).unwrap().profile_revision = admission.revision;
                    Ok(id)
                }
                .await;
                let id = match join {
                    Ok(id) => id,
                    Err(error) => {
                        connection.close(1u32.into(), b"identity rejected");
                        return Err(error);
                    }
                };
                let result = play(&connection, &world, id, ticks).await;
                world.lock().unwrap().leave(id);
                connection.close(0u32.into(), b"session ended");
                result
            }
            .await;
            if let Err(error) = result {
                eprintln!("multiplayer session: {error}");
            }
        });
    }
    endpoint.close(0u32.into(), b"server shutdown");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn ticket_authenticates_and_rejects_tampering() {
        let secret = b"01234567890123456789012345678901";
        let mut payload = vec![1];
        payload.extend(
            (SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs() as u32
                + 30)
                .to_le_bytes(),
        );
        payload.extend([7u8; 32]);
        let mut mac = Hmac::<Sha256>::new_from_slice(secret).unwrap();
        mac.update(&payload);
        payload.extend(mac.finalize().into_bytes());
        assert_eq!(authenticate(&payload, secret).unwrap().0, [7u8; 16]);
        payload[5] = 8;
        assert!(authenticate(&payload, secret).is_err());
        assert!(authenticate(&payload[..68], secret).is_err());
    }
}
