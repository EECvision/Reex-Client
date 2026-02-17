import { useEffect, useState } from 'react';

// Extend window interface
declare global {
    interface Window {
        FlutterwaveCheckout: (config: any) => void;
        define: any; // Add define to window for AMD hack
    }
}

interface FlutterwaveConfig {
    public_key: string;
    tx_ref: string;
    amount: number;
    currency: string;
    payment_options: string;
    payment_plan?: string; // Optional
    customer: {
        email: string;
        phone_number?: string;
        name: string;
    };
    customizations: {
        title: string;
        description: string;
        logo: string;
    };
    callback?: (response: any) => void;
    onClose?: () => void;
}

export const useFlutterwaveCustom = (config: FlutterwaveConfig) => {
    const [scriptLoaded, setScriptLoaded] = useState(false);

    useEffect(() => {
        const scriptId = 'flutterwave-script';

        // Check if script is already loaded
        if (document.getElementById(scriptId)) {
            setScriptLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.flutterwave.com/v3.js';
        script.id = scriptId;
        script.async = true;

        // --- AMD BYPASS START ---
        // Save the current define function if it exists (Monaco puts it there)
        const oldDefine = window.define;

        // Temporarily unset define.amd to prevent UMD scripts from using it
        if (window.define && window.define.amd) {
            window.define = undefined;
        }
        // --- AMD BYPASS END ---

        const restoreDefine = () => {
            if (oldDefine) {
                window.define = oldDefine;
            }
        };

        const timeoutId = setTimeout(restoreDefine, 10000); // Safety timeout

        script.onload = () => {
            clearTimeout(timeoutId);
            setScriptLoaded(true);
            restoreDefine();
        };

        script.onerror = () => {
            clearTimeout(timeoutId);
            restoreDefine();
        };

        document.body.appendChild(script);

        // Cleanup function (optional, usually scripts stay)
        return () => {
            // We usually don't remove payment scripts on unmount to avoid reload issues
        };
    }, []);

    const handlePayment = (options?: { callback?: (response: any) => void; onClose?: () => void }) => {
        if (!scriptLoaded) {
            console.warn("Flutterwave script not loaded yet");
            return;
        }

        if (window.FlutterwaveCheckout) {
            const paymentConfig = {
                ...config,
                ...options,
                callback: options?.callback || config.callback,
                onclose: options?.onClose || config.onClose // Note lowercase 'onclose'
            };

            window.FlutterwaveCheckout(paymentConfig);
        } else {
            console.error("FlutterwaveCheckout function not found on window");
        }
    };

    return handlePayment;
};
