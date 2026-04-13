import { Search, ListFilter } from "lucide-react";
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
    return (
        <div className="p-4 border-b border-border/50 bg-muted/20 flex flex-col gap-4">
            <div className="text-sm font-medium text-muted-foreground">
                {searchQuery.trim() ? `Found ${totalCount}` : `Total: ${totalCount}`}
            </div>
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Find friends"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="h-9 pl-9 bg-card border-border rounded-lg text-sm"
                    />
                </div>

                <Select value={sortDir} onValueChange={(v) => onSortDirChange(v as "name-asc" | "name-desc")}>
                    <SelectTrigger className="w-45 h-9 bg-card">
                        <ListFilter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Name (A-Z)" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                        <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    </SelectContent>
                </Select>

                {activeTab === "friends" && (
                    <Select value={onlineFilter} onValueChange={(v) => onOnlineFilterChange(v as "all" | "online")}>
                        <SelectTrigger className="w-35 h-9 bg-card">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="online">Online</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            </div>
        </div>
    );
}
