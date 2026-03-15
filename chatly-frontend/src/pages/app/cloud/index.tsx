import { useEffect } from "react";
import { toast } from "sonner";

export default function CloudPage() {
    useEffect(() => {
        toast.info("Development in progress...");
    }, []);

    return <div>Coding ...</div>;
}
