use multiplayer_demo::{
    web,
    world::{Budget, IDLE_TIMEOUT, MAX_INPUT, Shared},
};
use serde_json::json;
use std::time::{Duration, Instant};
use tokio::time::timeout;
use wtransport::{Connection, Endpoint, Identity, ServerConfig, endpoint::IncomingSession};

#[tokio::main(worker_threads = 2)]
async fn main() -> anyhow::Result<()> {
    let http_port = web::port("WT_HTTP_PORT", 3102);
    let udp_port = web::port("WT_PORT", 4433);
    // Ephemeral P-256 certificate, valid for 14 days, pinned by the local page.
    let public_name = std::env::var("DEMO_CERT_HOST").unwrap_or_else(|_| "localhost".into());
    let identity = Identity::self_signed(["localhost", "127.0.0.1", "::1", public_name.as_str()])?;
    let hash = identity.certificate_chain().as_slice()[0].hash();
    let config = ServerConfig::builder()
        .with_bind_address(web::quic_address(udp_port))
        .with_identity(identity)
        .keep_alive_interval(Some(Duration::from_secs(2)))
        .max_idle_timeout(Some(Duration::from_secs(15)))?
        .build();
    let endpoint = Endpoint::server(config)?;
    let shared = Shared::default();
    let ticker = tokio::spawn(shared.clone().run());
    let app = web::router(
        "webtransport",
        json!({ "transport":"webtransport", "udpPort":udp_port,
        "certificateHash": hash.as_ref().to_vec(), "otherPort":web::port("WS_PORT", 3101),
        "playUrl":std::env::var("DEMO_PUBLIC_URL").ok() }),
    );
    let listener = tokio::net::TcpListener::bind(web::address(http_port)).await?;
    println!("WebTransport demo: http://localhost:{http_port}/webtransport/ (QUIC UDP {udp_port})");
    let http = axum::serve(listener, app).with_graceful_shutdown(async {
        let _ = tokio::signal::ctrl_c().await;
    });
    tokio::select! {
        result = http => { result?; }
        result = async {
            loop {
                let incoming = endpoint.accept().await;
                let shared = shared.clone();
                tokio::spawn(async move {
                    if let Err(error) = session(incoming, shared, http_port).await { eprintln!("WT session: {error}"); }
                });
            }
            #[allow(unreachable_code)] Ok::<(), anyhow::Error>(())
        } => { result?; }
    }
    endpoint.close(0u32.into(), b"server shutdown");
    ticker.abort();
    Ok(())
}

async fn session(incoming: IncomingSession, shared: Shared, http_port: u16) -> anyhow::Result<()> {
    let request = timeout(Duration::from_secs(5), incoming).await??;
    if request.path() != "/play" {
        request.not_found().await;
        return Ok(());
    }
    if !web::origin_allowed(request.origin(), http_port) {
        request.forbidden().await;
        return Ok(());
    }
    let connection = timeout(Duration::from_secs(5), request.accept()).await??;
    let Some(id) = shared.join() else {
        let _ = reliable(
            &connection,
            &json!({"type":"error", "message":"Phòng đã đủ 8 người."}).to_string(),
        )
        .await;
        connection.close(1u32.into(), b"room full");
        return Ok(());
    };
    let result = play(&connection, &shared, id).await;
    let remotely_closed = matches!(
        result
            .as_ref()
            .err()
            .and_then(|error| error.downcast_ref::<wtransport::error::ConnectionError>()),
        Some(
            wtransport::error::ConnectionError::ApplicationClosed(_)
                | wtransport::error::ConnectionError::LocallyClosed
        )
    );
    shared.leave(id);
    connection.close(0u32.into(), b"session ended");
    if remotely_closed { Ok(()) } else { result }
}

async fn reliable(connection: &Connection, message: &str) -> anyhow::Result<()> {
    timeout(Duration::from_secs(3), async {
        let mut stream = connection.open_uni().await?.await?;
        stream.write_all(format!("{message}\n").as_bytes()).await?;
        stream.finish().await?;
        anyhow::Ok(())
    })
    .await??;
    Ok(())
}

async fn play(connection: &Connection, shared: &Shared, id: u32) -> anyhow::Result<()> {
    reliable(connection, &shared.welcome(id)).await?;
    anyhow::ensure!(
        connection.max_datagram_size().is_some_and(|n| n >= 1100),
        "datagrams unavailable or too small"
    );
    let mut snapshots = shared.snapshots.subscribe();
    let mut budget = Budget::default();
    let mut last_input = Instant::now();
    let mut heartbeat = tokio::time::interval(Duration::from_secs(3));
    loop {
        tokio::select! {
            datagram = connection.receive_datagram() => {
                let bytes = datagram?;
                if bytes.len() > MAX_INPUT || !budget.allow() { anyhow::bail!("input size/rate exceeded"); }
                last_input = Instant::now();
                if let Some(reply) = shared.command(id, &bytes) { connection.send_datagram(reply.as_bytes())?; }
            }
            changed = snapshots.changed() => {
                changed?;
                let snapshot = snapshots.borrow_and_update().clone();
                connection.send_datagram(snapshot.as_bytes())?;
            }
            // Clients use only datagrams for input. Reject unexpected streams rather than buffering them.
            stream = connection.accept_uni() => { stream?; anyhow::bail!("unexpected client stream"); }
            stream = connection.accept_bi() => { stream?; anyhow::bail!("unexpected client stream"); }
            _ = heartbeat.tick() => {
                if last_input.elapsed() > IDLE_TIMEOUT { break; }
            }
        }
    }
    Ok(())
}
