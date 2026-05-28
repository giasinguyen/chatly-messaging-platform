import { Search, ListFilter } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { ContactTab } from "../index";

interface ContactFiltersProps {
    activeTab: ContactTab;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    totalCount: number;
    sortDir: "name-asc" | "name-desc";
    onSortDirChange: (value: "name-asc" | "name-desc") => void;
    onlineFilter: "all" | "online";
    onOnlineFilterChange: (value: "all" | "online") => void;
}

export function ContactFilters({ activeTab, searchQuery, onSearchChange, totalCount, sortDir, onSortDirChange, onlineFilter, onOnlineFilterChange }: ContactFiltersProps) {
    const { t } = useTranslation();

    return (
        <div className="p-4 border-b border-border/50 bg-muted/20 flex flex-col gap-4">
            <div className="text-sm font-medium text-muted-foreground">
                {searchQuery.trim()
                    ? t("contact.found_count", { count: totalCount })
                    : t("contact.total_count", { count: totalCount })}
            </div>
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t("contact.find_friends")}
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="h-9 pl-9 bg-card border-border rounded-lg text-sm"
                    />
                </div>

                <Select value={sortDir} onValueChange={(v) => onSortDirChange(v as "name-asc" | "name-desc")}>
                    <SelectTrigger className="w-45 h-9 bg-card">
                        <ListFilter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder={t("contact.name_asc")} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="name-asc">{t("contact.name_asc")}</SelectItem>
                        <SelectItem value="name-desc">{t("contact.name_desc")}</SelectItem>
                    </SelectContent>
                </Select>

                {activeTab === "friends" && (
                    <Select value={onlineFilter} onValueChange={(v) => onOnlineFilterChange(v as "all" | "online")}>
                        <SelectTrigger className="w-35 h-9 bg-card">
                            <SelectValue placeholder={t("contact.all")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("contact.all")}</SelectItem>
                            <SelectItem value="online">{t("contact.online")}</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            </div>
        </div>
    );
}
