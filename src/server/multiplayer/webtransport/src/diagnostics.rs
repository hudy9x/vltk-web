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
