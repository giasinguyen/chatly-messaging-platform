import { useEffect } from "react";
import { toast } from "sonner";

export default function CloudPage() {
    useEffect(() => {
        toast.info("UI Test only, Development in progress...");
    }, []);

    return <div>Coding ...</div>;
}
