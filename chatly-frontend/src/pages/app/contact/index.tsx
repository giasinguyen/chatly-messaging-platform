import { ContactList } from "./components/ContactList";
import { ContactDetails } from "./components/ContactDetails";
import { useEffect } from "react";
import { toast } from "sonner";

export default function ContactPage() {
    useEffect(() => {
        toast.info("Development in progress...");
    }, []);
    return (
        <div className="flex h-full w-full overflow-hidden">
            <ContactList />
            <ContactDetails />
        </div>
    );
}
