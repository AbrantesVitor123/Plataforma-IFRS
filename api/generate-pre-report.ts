// This API route is disabled.
export default function handler(req, res) {
    res.setHeader('Allow', 'POST');
    if (req.method !== 'POST') {
        return res.status(405).end('Method Not Allowed');
    }
    return res.status(501).json({ error: 'AI analysis feature is disabled.' });
}
