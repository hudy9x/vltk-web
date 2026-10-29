use anyhow::{Result, ensure};
use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeMap,
    fs::{File, OpenOptions},
    io::Write,
    path::PathBuf,
};
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Grant {
    #[serde(default, skip_serializing_if="Option::is_none")]
    pub death: Option<DeathRequest>,
    #[serde(default, skip_serializing_if="is_zero")]
    pub knb: u32,
    #[serde(default, skip_serializing_if="Option::is_none")]
    pub potion: Option<PotionDebit>,
    pub id: String,
    pub account: String,
    pub slot: u8,
    pub xp: u32,
    pub gold: u32,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PotionDebit { pub id: u16, pub spent: u32 }
fn is_zero(value:&u32)->bool{*value==0}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DeathRequest {pub map:u32,pub x:f32,pub y:f32,pub life:u32,pub notice:super::lifecycle::DeathNotice}
/// Write-ahead grants survive crashes. SQLite delivery is idempotent by grant ID.
pub struct Outbox {
    path: PathBuf,
    file: File,
    pub pending: BTreeMap<String, Grant>,
    epoch: u128,
    lines: usize,
    next_debit: u64,
}
impl Outbox {
    #[cfg(test)]
    pub fn path_for_test(&self) -> PathBuf {
        self.path.clone()
    }
    pub fn open(path: PathBuf) -> Result<Self> {
        if let Some(parent) = path.parent().filter(|p| !p.as_os_str().is_empty()) {
            std::fs::create_dir_all(parent)?;
        }
        let file = OpenOptions::new().create(true).append(true).open(&path)?;
        let mut pending = BTreeMap::new();
        let text = std::fs::read_to_string(&path)?;
        // Ignore only an incomplete tail, never silently discard a corrupt complete record.
        for line in text.split_inclusive('\n').filter(|s| s.ends_with('\n')) {
            let value: serde_json::Value = serde_json::from_str(line)?;
            if let Some(id) = value.get("ack").and_then(|v| v.as_str()) {
                pending.remove(id);
            } else {
                let g: Grant = serde_json::from_value(value)?;
                pending.insert(g.id.clone(), g);
            }
        }
        if !text.is_empty() && !text.ends_with('\n') {
            let at = text.rfind('\n').map_or(0, |i| i + 1);
            file.set_len(at as u64)?;
        }
        Ok(Self {
            path,
            file,
            pending,
            epoch: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_nanos(),
            lines: 0,
            next_debit: 0,
        })
    }
    fn append(&mut self, bytes: &[u8]) -> Result<()> {
        let offset = self.file.metadata()?.len();
        if let Err(error) = self.file.write_all(bytes) {
            self.file.set_len(offset)?;
            return Err(error.into());
        }
        self.file.sync_data()?;
        self.lines += 1;
        Ok(())
    }
    pub fn grant(
        &mut self,
        key: String,
        account: String,
        slot: u8,
        xp: u32,
        gold: u32,
    ) -> Result<()> {
        let id = format!("{}-{key}", self.epoch);
        if self.pending.contains_key(&id) {
            return Ok(());
        }
        ensure!(self.pending.len() < 4096, "reward delivery backlog full");
        let g = Grant {
            death: None,
            knb: 0,
            potion: None,
            id,
            account,
            slot,
            xp,
            gold,
        };
        // A retry uses the same ID even if sync_data failed after writing a complete line.
        self.append(format!("{}\n", serde_json::to_string(&g)?).as_bytes())?;
        self.pending.insert(g.id.clone(), g);
        Ok(())
    }
    pub fn consume(&mut self, account:String, slot:u8, potion:PotionDebit) -> Result<()> {
        let id=format!("{}-{}-2",self.epoch,self.next_debit);
        ensure!(self.pending.len()<4096,"delivery backlog full");
        let grant=Grant{id,account,slot,xp:0,gold:0,potion:Some(potion),death:None,knb:0};
        self.append(format!("{}\n",serde_json::to_string(&grant)?).as_bytes())?;
        self.next_debit+=1;
        self.pending.insert(grant.id.clone(),grant);
        Ok(())
    }
    pub fn death(&mut self,actor:u32,life:u32,account:String,slot:u8,death:DeathRequest)->Result<String>{
        let id=format!("{}-{actor}-{life}-3",self.epoch);
        self.currency_grant(Grant{id:id.clone(),account,slot,xp:0,gold:0,potion:None,death:Some(death),knb:0})?;
        Ok(id)
    }
    pub fn credit_knb(&mut self,id:String,account:String,slot:u8,knb:u32)->Result<()> {
        self.currency_grant(Grant{id,account,slot,xp:0,gold:0,potion:None,death:None,knb})
    }
    pub fn credit_gold(&mut self,id:String,account:String,slot:u8,gold:u32)->Result<()> {
        self.currency_grant(Grant{id,account,slot,xp:0,gold,potion:None,death:None,knb:0})
    }
    fn currency_grant(&mut self,grant:Grant)->Result<()> {
        if self.pending.contains_key(&grant.id){return Ok(());}
        ensure!(self.pending.len()<4096,"delivery backlog full");
        self.append(format!("{}\n",serde_json::to_string(&grant)?).as_bytes())?;
        self.pending.insert(grant.id.clone(),grant);Ok(())
    }
    pub fn ack(&mut self, ids: &[String]) -> Result<()> {
        let ids: Vec<_> = ids
            .iter()
            .filter(|id| self.pending.contains_key(*id))
            .collect();
        if !ids.is_empty() {
            let mut bytes = Vec::new();
            for id in &ids {
                writeln!(bytes, "{}", serde_json::json!({"ack":id}))?;
            }
            self.append(&bytes)?;
            for id in ids {
                self.pending.remove(id);
            }
        }
        if self.lines > 1024 {
            let temp = self.path.with_extension("tmp");
            let mut file = File::create(&temp)?;
            for g in self.pending.values() {
                writeln!(file, "{}", serde_json::to_string(g)?)?;
            }
            file.sync_all()?;
            std::fs::rename(temp, &self.path)?;
            self.file = OpenOptions::new().append(true).open(&self.path)?;
            self.lines = 0;
        }
        Ok(())
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn durable_delivery_and_ack() {
        let p = std::env::temp_dir().join(format!("vltk-outbox-{}.jsonl", std::process::id()));
        let _ = std::fs::remove_file(&p);
        let mut o = Outbox::open(p.clone()).unwrap();
        o.grant("1-0-0".into(), "a".into(), 0, 5, 2).unwrap();
        o.grant("1-0-0".into(), "a".into(), 0, 5, 2).unwrap();
        assert_eq!(o.pending.len(), 1);
        let id = o.pending.keys().next().unwrap().clone();
        drop(o);
        let mut o = Outbox::open(p.clone()).unwrap();
        assert_eq!(o.pending.len(), 1);
        o.ack(&[id.clone(), id]).unwrap();
        drop(o);
        assert!(Outbox::open(p.clone()).unwrap().pending.is_empty());
        std::fs::remove_file(p).unwrap();
    }
}
