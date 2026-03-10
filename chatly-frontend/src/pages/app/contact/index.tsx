import { ContactList } from "./components/ContactList";
import { ContactDetails } from "./components/ContactDetails";

export default function ContactPage() {
    return (
        <div className="flex h-full w-full overflow-hidden">
            <ContactList />
            <ContactDetails />
        </div>
    );
}
