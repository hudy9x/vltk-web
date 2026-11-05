use std::sync::OnceLock;
pub const REVISION: &str = "skill-trace-20261028-1";
pub fn enabled() -> bool {
    *static_flag().get_or_init(|| std::env::var("ONLINE_DEBUG").is_ok_and(|v| v == "1"))
}
fn static_flag() -> &'static OnceLock<bool> {
    static VALUE: OnceLock<bool> = OnceLock::new();
    &VALUE
}
pub fn log(stage: &str, details: serde_json::Value) {
    if enabled() {
        eprintln!(
            "[online:server] {}",
            serde_json::json!({"revision":REVISION,"stage":stage,"pid":std::process::id(),"details":details})
        );
    }
}

/// Low-volume connection timings are independent of verbose combat debugging.
pub fn timing(stage: &str, trace: &str, started: std::time::Instant, details: serde_json::Value) {
    if std::env::var("ONLINE_TIMING").is_ok_and(|v| v == "0") { return; }
    let unix_ms = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis();
    eprintln!("[online:timing] {}", serde_json::json!({"timeUnixMs":unix_ms,"side":"rust","stage":stage,"trace":trace,"elapsedMs":started.elapsed().as_millis(),"details":details}));
}
