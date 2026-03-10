import { ContactList } from "./components/ContactList";
import { ContactDetails } from "./components/ContactDetails";
import { useEffect } from "react";

export default function ContactPage() {
    useEffect(() => {
        alert("UI Test only, Development in progress...");
    }, []);
    return (
        <div className="flex h-full w-full overflow-hidden">
            <ContactList />
            <ContactDetails />
        </div>
    );
}
