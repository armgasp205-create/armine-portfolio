(function (root) {
    const memory = new Map();
    const storage = {
        getItem(key) { try { return root.localStorage.getItem(key); } catch { return memory.get(key) ?? null; } },
        setItem(key, value) { memory.set(key, String(value)); try { root.localStorage.setItem(key, String(value)); } catch { /* Continue without persistence. */ } },
        json(key, fallback) { try { return JSON.parse(storage.getItem(key)) ?? fallback; } catch { return fallback; } }
    };
    function normalizeCart(value, products) {
        if (!Array.isArray(value)) return [];
        const seen = new Set();
        return value.flatMap(item => {
            const product = products.find(product => product.id === item?.id);
            if (!product || seen.has(product.id) || !Number.isInteger(item.quantity) || item.quantity < 1) return [];
            seen.add(product.id);
            return [{ ...product, quantity: Math.min(item.quantity, 99) }];
        });
    }
    root.Frontend = { storage, normalizeCart };
    if (typeof module !== "undefined") module.exports = root.Frontend;
})(globalThis);
