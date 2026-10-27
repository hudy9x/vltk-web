use axum::{
    Json, Router,
    http::{HeaderValue, header},
    routing::get,
};
use serde_json::{Value, json};
use std::{
    net::{IpAddr, SocketAddr},
    path::PathBuf,
};
use tower_http::{
    cors::{AllowOrigin, CorsLayer},
    services::ServeDir,
    set_header::SetResponseHeaderLayer,
};

pub fn port(name: &str, default: u16) -> u16 {
    std::env::var(name)
        .map(|v| v.parse().expect("invalid port"))
        .unwrap_or(default)
}

pub fn address(port: u16) -> SocketAddr {
    let ip: IpAddr = std::env::var("DEMO_BIND")
        .unwrap_or_else(|_| "127.0.0.1".into())
        .parse()
        .expect("DEMO_BIND must be an IP address");
    SocketAddr::new(ip, port)
}

pub fn origin_allowed(origin: Option<&str>, port: u16) -> bool {
    let Some(origin) = origin else {
        return false;
    };
    origin == format!("http://localhost:{port}")
        || origin == format!("http://127.0.0.1:{port}")
        || std::env::var("DEMO_ORIGIN").is_ok_and(|allowed| allowed == origin)
}

pub fn router(kind: &'static str, config: Value) -> Router {
    let client = std::env::var_os("DEMO_CLIENT_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../client/multiplayer-demo")
        });
    let http_port = if kind == "websocket" {
        port("WS_PORT", 3101)
    } else {
        port("WT_HTTP_PORT", 3102)
    };
    Router::new()
        .route(
            "/",
            get(move || async move { axum::response::Redirect::temporary(&format!("/{kind}/")) }),
        )
        .route(
            "/config",
            get(move || {
                let config = config.clone();
                async move { Json(config) }
            }),
        )
        .route(
            "/health",
            get(move || async move { Json(json!({"ok": true, "transport": kind})) }),
        )
        .fallback_service(ServeDir::new(client))
        .layer(
            CorsLayer::new().allow_origin(AllowOrigin::predicate(move |origin, _| {
                origin
                    .to_str()
                    .is_ok_and(|origin| origin_allowed(Some(origin), http_port))
            })),
        )
        .layer(SetResponseHeaderLayer::overriding(
            header::CACHE_CONTROL,
            HeaderValue::from_static("no-store"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
}

/// QUIC can listen publicly while the HTTP configuration server stays on loopback.
pub fn quic_address(port: u16) -> SocketAddr {
    match std::env::var("DEMO_QUIC_BIND") {
        Ok(ip) => SocketAddr::new(
            ip.parse().expect("DEMO_QUIC_BIND must be an IP address"),
            port,
        ),
        Err(_) => address(port),
    }
}
