use axum::{
    Router,
    extract::{
        State, WebSocketUpgrade,
        ws::{Message, WebSocket},
    },
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
};
use multiplayer_demo::{
    web,
    world::{Budget, IDLE_TIMEOUT, MAX_INPUT, Shared},
};
use serde_json::json;
use std::time::{Duration, Instant};
use tokio::time::timeout;

#[tokio::main(worker_threads = 2)]
async fn main() -> anyhow::Result<()> {
    let port = web::port("WS_PORT", 3101);
    let shared = Shared::default();
    let ticker = tokio::spawn(shared.clone().run());
    let app = web::router(
        "websocket",
        json!({ "transport": "websocket", "otherPort": web::port("WT_HTTP_PORT", 3102),
            "playUrl": std::env::var("DEMO_PUBLIC_URL").ok() }),
    )
    .merge(
        Router::new()
            .route("/play", get(upgrade))
            .with_state((shared, port)),
    );
    let listener = tokio::net::TcpListener::bind(web::address(port)).await?;
    println!("WebSocket demo: http://localhost:{port}/websocket/ (TCP {port})");
    tokio::select! {
        result = async { axum::serve(listener, app).await } => { result?; }
        _ = tokio::signal::ctrl_c() => {}
    }
    ticker.abort();
    Ok(())
}

async fn upgrade(
    State((shared, port)): State<(Shared, u16)>,
    headers: HeaderMap,
    ws: WebSocketUpgrade,
) -> Response {
    if !web::origin_allowed(headers.get("origin").and_then(|h| h.to_str().ok()), port) {
        return StatusCode::FORBIDDEN.into_response();
    }
    ws.max_message_size(MAX_INPUT)
        .max_frame_size(MAX_INPUT)
        .on_upgrade(move |socket| session(socket, shared))
        .into_response()
}

async fn session(mut socket: WebSocket, shared: Shared) {
    let Some(id) = shared.join() else {
        let _ = send(
            &mut socket,
            json!({"type":"error", "message":"Phòng đã đủ 8 người."}).to_string(),
        )
        .await;
        let _ = socket.send(Message::Close(None)).await;
        return;
    };
    let result = play(&mut socket, &shared, id).await;
    shared.leave(id);
    if let Err(error) = result {
        eprintln!("WS player {id}: {error}");
    }
}

async fn send(socket: &mut WebSocket, text: String) -> anyhow::Result<()> {
    timeout(
        Duration::from_secs(3),
        socket.send(Message::Text(text.into())),
    )
    .await??;
    Ok(())
}

async fn play(socket: &mut WebSocket, shared: &Shared, id: u32) -> anyhow::Result<()> {
    send(socket, shared.welcome(id)).await?;
    let mut snapshots = shared.snapshots.subscribe();
    let mut budget = Budget::default();
    let mut last_input = Instant::now();
    let mut heartbeat = tokio::time::interval(Duration::from_secs(3));
    loop {
        tokio::select! {
            incoming = socket.recv() => {
                let Some(incoming) = incoming else { break; };
                let incoming = incoming?;
                let data = match &incoming {
                    Message::Text(t) => t.as_bytes(),
                    Message::Binary(b) => b.as_ref(),
                    Message::Close(_) => break,
                    _ => continue,
                };
                if !budget.allow() { anyhow::bail!("input rate exceeded"); }
                last_input = Instant::now();
                if let Some(reply) = shared.command(id, data) { send(socket, reply).await?; }
            }
            changed = snapshots.changed() => {
                changed?;
                let snapshot = snapshots.borrow_and_update().clone();
                send(socket, snapshot).await?;
            }
            _ = heartbeat.tick() => {
                if last_input.elapsed() > IDLE_TIMEOUT { break; }
            }
        }
    }
    Ok(())
}
