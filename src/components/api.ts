// small api helper
const API_BASE = "http://localhost/batik-api/api";

export async function fetchNonAvailability() {
  const r = await fetch(`${API_BASE}/fetch_nonavailability.php`);
  return r.json();
}
export async function fetchHistory() {
  const r = await fetch(`${API_BASE}/fetch_history.php`);
  return r.json();
}
export async function insertNonAvailability(payload: any) {
  const r = await fetch(`${API_BASE}/insert_nonavailability.php`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  return r.json();
}
export async function updateNonAvailability(payload: any) {
  const r = await fetch(`${API_BASE}/update_nonavailability.php`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  return r.json();
}
export async function deleteNonAvailability(id: number) {
  const r = await fetch(`${API_BASE}/delete_nonavailability.php`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({id})
  });
  return r.json();
}
export async function resetMonth() {
  const r = await fetch(`${API_BASE}/reset_month.php`);
  return r.json();
}
