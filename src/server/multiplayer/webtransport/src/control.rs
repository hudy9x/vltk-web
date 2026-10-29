use crate::{
    domain::definitions::{Admission, Definitions},
    world::World,
};
use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, State},
    http::{HeaderMap, StatusCode},
    routing::{get, post},
};
use std::sync::{Arc, Mutex};
#[derive(Clone)]
struct Control {
    world: Arc<Mutex<World>>,
    secret: String,
}
fn authorize(h: &HeaderMap, s: &Control) -> Result<(), StatusCode> {
    // Compare HMAC digests in constant time, including unequal-length header values.
    use hmac::{Hmac, Mac};
    use sha2::Sha256;
    let supplied = h
        .get("x-multiplayer-secret")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    let mut mac = Hmac::<Sha256>::new_from_slice(s.secret.as_bytes())
        .map_err(|_| StatusCode::UNAUTHORIZED)?;
    mac.update(s.secret.as_bytes());
    let expected = mac.finalize().into_bytes();
    let mut mac = Hmac::<Sha256>::new_from_slice(s.secret.as_bytes())
        .map_err(|_| StatusCode::UNAUTHORIZED)?;
    mac.update(supplied.as_bytes());
    mac.verify_slice(&expected)
        .map_err(|_| StatusCode::UNAUTHORIZED)
}
pub fn routes(world: Arc<Mutex<World>>, secret: String) -> Router {
    Router::new()
        .route(
            "/catalog",
            post(
                |State(s): State<Control>, h: HeaderMap, Json(d): Json<Definitions>| async move {
                    authorize(&h, &s)?;
                    s.world
                        .lock()
                        .unwrap()
                        .game
                        .install(d)
                        .map_err(|_| StatusCode::BAD_REQUEST)?;
                    Ok::<_, StatusCode>(Json(true))
                },
            ),
        )
        .route(
            "/admit",
            post(
                |State(s): State<Control>, h: HeaderMap, Json(a): Json<Admission>| async move {
                    authorize(&h, &s)?;
                    if a.nonce.len() != 32 || a.account.len() != 36 || a.slot > 2 {
                        return Err(StatusCode::BAD_REQUEST);
                    }
                    let mut w = s.world.lock().unwrap();
                    w.admissions
                        .retain(|_, (_, at)| at.elapsed().as_secs() < 30);
                    if w.admissions.len() >= 128 {
                        return Err(StatusCode::TOO_MANY_REQUESTS);
                    }
                    w.admissions
                        .insert(a.nonce.clone(), (a, std::time::Instant::now()));
                    Ok(Json(true))
                },
            ),
        )
        .route(
            "/refresh",
            post(
                |State(s): State<Control>, h: HeaderMap, Json(a): Json<Admission>| async move {
                    authorize(&h, &s)?;
                    let mut w = s.world.lock().unwrap();
                    let ids:Vec<_>=w.game.actors.iter().filter(|(_,p)|p.account==a.account&&p.slot==a.slot).map(|(&id,_)|id).collect();
                    for id in ids { w.game.refresh_profile(id,a.profile.clone(),a.revision); }
                    Ok::<_, StatusCode>(Json(true))
                },
            ),
        )
        .route(
            "/rewards",
            get(|State(s): State<Control>, h: HeaderMap| async move {
                authorize(&h, &s)?;
                Ok::<_, StatusCode>(Json(
                    s.world
                        .lock()
                        .unwrap()
                        .game
                        .outbox
                        .pending
                        .values()
                        .take(128)
                        .cloned()
                        .collect::<Vec<_>>(),
                ))
            }),
        )
        .route(
            "/rewards/ack",
            post(
                |State(s): State<Control>, h: HeaderMap, Json(ids): Json<Vec<String>>| async move {
                    authorize(&h, &s)?;
                    if ids.len() > 128 {
                        return Err(StatusCode::BAD_REQUEST);
                    }
                    s.world
                        .lock()
                        .unwrap()
                        .game
                        .outbox
                        .ack(&ids)
                        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
                    Ok(Json(true))
                },
            ),
        )
        .layer(DefaultBodyLimit::max(4 * 1024 * 1024))
        .with_state(Control { world, secret })
}
