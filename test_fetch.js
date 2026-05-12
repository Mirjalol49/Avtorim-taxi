const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

async function run() {
    const res = await fetch(`${url}/rest/v1/transactions?select=id,cheque_image,created_ms&cheque_image=not.is.null&limit=20&order=created_ms.asc`, {
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
        }
    });
    const data = await res.json();
    console.log(data.map(d => ({
        id: d.id,
        preview: d.cheque_image.substring(0, 50),
        length: d.cheque_image.length
    })));
}
run();
