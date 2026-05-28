import { Link } from "react-router-dom";

const POST_TEXT_TOKEN_REGEX = /(https?:\/\/[^\s<]+|www\.[^\s<]+|@AI|@[A-Za-z0-9_.-]+)/g;
const MENTION_TOKEN_REGEX = /^(@AI|@[A-Za-z0-9_.-]+)$/;
const URL_TOKEN_REGEX = /^(https?:\/\/[^\s<]+|www\.[^\s<]+)$/i;
const URL_PROTOCOL_REGEX = /^https?:\/\//i;
const URL_TRAILING_PUNCTUATION_REGEX = /[),.!?;:]+$/;

interface LinkifiedPostTextProps {
    text: string;
}

export function LinkifiedPostText({ text }: LinkifiedPostTextProps) {
    const tokens = text.split(POST_TEXT_TOKEN_REGEX);

    return tokens.map((token, index) => {
        const isUrl = URL_TOKEN_REGEX.test(token);
        if (isUrl) {
            const linkText = token.replace(URL_TRAILING_PUNCTUATION_REGEX, "");
            const trailingText = token.slice(linkText.length);
            const href = URL_PROTOCOL_REGEX.test(linkText)
                ? linkText
                : `https://${linkText}`;

            return (
                <span key={`${token}-${index}`}>
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-purple-600 hover:underline dark:text-purple-400"
                        onPointerDown={(event) => event.stopPropagation()}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                    >
                        {linkText}
                    </a>
                    {trailingText}
                </span>
            );
        }

        const isMention = MENTION_TOKEN_REGEX.test(token);
        if (!isMention) {
            return <span key={`${token}-${index}`}>{token}</span>;
        }

        if (token.toLowerCase() === "@ai") {
            return (
                <span
                    key={`${token}-${index}`}
                    className="font-medium text-indigo-600 dark:text-indigo-400"
                >
                    {token}
                </span>
            );
        }

        const username = token.slice(1);

        return (
            <Link
                key={`${token}-${index}`}
                to={`/u/${username}`}
                className="font-medium text-indigo-600 dark:text-indigo-400"
                onPointerDown={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
            >
                {token}
            </Link>
        );
    });
}
