import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ContactList } from "./components/ContactList";
import { ContactDetails } from "./components/ContactDetails";

export type ContactTab = "friends" | "requests" | "blocked";

export default function ContactPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<ContactTab>("friends");

    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab === "requests" || tab === "blocked") {
            setActiveTab(tab);
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    return (
        <div className="flex h-full w-full overflow-hidden">
            <ContactList activeTab={activeTab} onTabChange={setActiveTab} />
            <ContactDetails activeTab={activeTab} />
        </div>
    );
}
