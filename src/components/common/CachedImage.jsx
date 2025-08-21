
import React, { useState, useEffect } from 'react';
import { getImageFromCache, saveImageToCache } from '../helpers/ImageCaching.jsx';
import { Loader2 } from 'lucide-react';

export default function CachedImage({ src, alt, className, ...props }) {
    const [imageSrc, setImageSrc] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadImage = async () => {
            if (!src) {
                if (isMounted) {
                    setLoading(false);
                    setImageSrc(null); // Define como nulo se não houver src
                }
                return;
            }

            if (isMounted) setLoading(true);

            try {
                // Tenta pegar do cache primeiro
                const cachedImage = await getImageFromCache(src);
                if (isMounted) {
                    if (cachedImage) {
                        setImageSrc(cachedImage);
                    } else {
                        // Se não estiver no cache, busca na rede e salva
                        const fetchedImage = await saveImageToCache(src);
                        setImageSrc(fetchedImage);
                    }
                }
            } catch (error) {
                console.error(`Erro ao carregar imagem ${src}:`, error);
                if (isMounted) {
                    // Fallback para a URL original em caso de qualquer erro
                    setImageSrc(src);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadImage();

        return () => {
            isMounted = false;
        };
    }, [src]);

    if (loading) {
        return (
            <div className={`flex items-center justify-center bg-gray-700 ${className}`}>
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
        );
    }

    if (!imageSrc) {
        // Renderiza um placeholder se não houver imagem
        return <div className={`bg-gray-600 ${className}`}></div>;
    }

    return (
        <img
            src={imageSrc}
            alt={alt}
            className={className}
            {...props}
        />
    );
}
