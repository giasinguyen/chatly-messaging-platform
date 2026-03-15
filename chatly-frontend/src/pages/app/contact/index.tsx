import { useState } from "react";
import { ContactList } from "./components/ContactList";
import { ContactDetails } from "./components/ContactDetails";

export type ContactTab = "friends" | "requests" | "blocked";

export default function ContactPage() {
    const [activeTab, setActiveTab] = useState<ContactTab>("friends");

    return (
        <div className="flex h-full w-full overflow-hidden">
            <ContactList activeTab={activeTab} onTabChange={setActiveTab} />
            <ContactDetails activeTab={activeTab} />
        </div>
    );
}
