/**
 * Format a number for display with human-readable suffixes.
 * Examples:
 * - formatCount(50) => "50"
 * - formatCount(1000) => "1K"
 * - formatCount(1234) => "1.2K"
 * - formatCount(1500) => "1.5K"
 * - formatCount(1000000) => "1M"
 * - formatCount(1234567) => "1.2M"
 *
 * @param count - The number to format
 * @returns Formatted string with suffix (K, M, B) or the number itself if < 1000
 */
export function formatCount(count: number): string {
    if (count < 1000) {
        return count.toString();
    }

    if (count < 1_000_000) {
        const thousands = count / 1000;
        // Round to 1 decimal place only if necessary
        const rounded = thousands % 1 === 0 ? thousands : parseFloat(thousands.toFixed(1));
        return `${rounded}K`;
    }

    if (count < 1_000_000_000) {
        const millions = count / 1_000_000;
        const rounded = millions % 1 === 0 ? millions : parseFloat(millions.toFixed(1));
        return `${rounded}M`;
    }

    const billions = count / 1_000_000_000;
    const rounded = billions % 1 === 0 ? billions : parseFloat(billions.toFixed(1));
    return `${rounded}B`;
}

/**
 * Format a date string to a human-readable format.
 * Examples:
 * - "2026-05-01T10:30:00Z" => "10:30"
 *
 * @param dateString - ISO date string
 * @returns Formatted time string
 */
export function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Format a date string to a human-readable date format.
 * Examples:
 * - Today's date => "Today"
 * - Yesterday => "Yesterday"
 * - Otherwise => "May 1, 2026"
 *
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (
        date.toDateString() === today.toDateString()
    ) {
        return "Today";
    }

    if (
        date.toDateString() === yesterday.toDateString()
    ) {
        return "Yesterday";
    }

    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}
