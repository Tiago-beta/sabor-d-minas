const DB_NAME = 'ImageCacheDB';
const STORE_NAME = 'images';
const DB_VERSION = 1;
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 dias

const getDb = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject("Erro ao abrir o banco de dados.");
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'url' });
            }
        };
    });
};

const cleanupExpiredImages = async () => {
    try {
        const db = await getDb();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        
        const allRecords = await new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        const now = Date.now();
        const expiredKeys = allRecords
            .filter(record => now - record.timestamp > CACHE_DURATION)
            .map(record => record.url);

        if (expiredKeys.length > 0) {
            expiredKeys.forEach(key => store.delete(key));
            console.log(`Cache: Limpeza de ${expiredKeys.length} imagens expiradas concluída.`);
        }
        
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (error) {
        console.error('Cache: Erro ao limpar imagens expiradas:', error);
    }
};

export const getImageFromCache = async (url) => {
    try {
        const db = await getDb();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(url);

        return new Promise((resolve) => {
            request.onsuccess = () => {
                const result = request.result;
                if (result && Date.now() - result.timestamp < CACHE_DURATION) {
                    resolve(result.data);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => {
                console.error(`Cache: Erro ao buscar imagem ${url}:`, request.error);
                resolve(null);
            };
        });
    } catch (error) {
        console.error(`Cache: Erro ao conectar ao DB para buscar imagem:`, error);
        return null;
    }
};

export const saveImageToCache = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Falha ao buscar a imagem: ${response.statusText}`);
        }
        const blob = await response.blob();

        const base64data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(blob);
        });

        const db = await getDb();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ url, data: base64data, timestamp: Date.now() });

        await new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });

        return base64data;
    } catch (error) {
        console.error(`Cache: Erro ao salvar imagem ${url}:`, error);
        return url; // Retorna a URL original em caso de falha
    }
};

// Iniciar a limpeza ao carregar o módulo
cleanupExpiredImages();