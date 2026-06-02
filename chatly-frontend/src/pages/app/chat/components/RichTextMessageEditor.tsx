import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    type JSX,
} from "react";
import {
    LexicalComposer,
    type InitialConfigType,
} from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { EditorState } from "lexical";
import {
    INSERT_ORDERED_LIST_COMMAND,
    INSERT_UNORDERED_LIST_COMMAND,
    ListItemNode,
    ListNode,
    REMOVE_LIST_COMMAND,
} from "@lexical/list";
import {
    $getRoot,
    $getSelection,
    $createParagraphNode,
    FORMAT_TEXT_COMMAND,
    KEY_ENTER_COMMAND,
    COMMAND_PRIORITY_EDITOR,
    type LexicalEditor,
    type LexicalCommand,
} from "lexical";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { Bold, Italic, Underline, Strikethrough, List, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MessageSendShortcut } from "@/store/messagePrefs.store";

type EditorMode = "plain" | "editor";

interface RichTextMessageEditorProps {
    initialHtml?: string;
    onChange: (nextHtml: string, nextText: string) => void;
    onSend: () => void;
    mode?: EditorMode;
    sendShortcut?: MessageSendShortcut;
}

interface EditorToolbarButton {
    icon: JSX.Element;
    title: string;
    onClick: () => void;
}

export interface RichTextMessageEditorRef {
    clear: () => void;
    focus: () => void;
    insertText: (text: string) => void;
    getContent: () => { html: string; text: string };
}

const PLACEHOLDER_TEXT = "Type a rich text message...";

const editorTheme = {
    paragraph: "m-0",
    list: {
        ul: "list-disc pl-5 my-1",
        ol: "list-decimal pl-5 my-1",
        listitem: "my-0.5",
    },
    text: {
        bold: "font-bold",
        italic: "italic",
        underline: "underline",
        strikethrough: "line-through",
    },
};

function EditorToolbar() {
    const [editor] = useLexicalComposerContext();
    const runEditorCommand = useCallback(
        (command: LexicalCommand<void>) => {
            editor.focus();
            editor.dispatchCommand(command, undefined);
        },
        [editor],
    );

    const buttons: EditorToolbarButton[] = useMemo(
        () => [
            {
                icon: <Bold size={14} />,
                title: "Bold",
                onClick: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold"),
            },
            {
                icon: <Italic size={14} />,
                title: "Italic",
                onClick: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic"),
            },
            {
                icon: <Underline size={14} />,
                title: "Underline",
                onClick: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline"),
            },
            {
                icon: <Strikethrough size={14} />,
                title: "Strikethrough",
                onClick: () =>
                    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough"),
            },
            {
                icon: <List size={14} />,
                title: "Bullet list",
                onClick: () => runEditorCommand(INSERT_UNORDERED_LIST_COMMAND),
            },
            {
                icon: <ListOrdered size={14} />,
                title: "Number list",
                onClick: () => runEditorCommand(INSERT_ORDERED_LIST_COMMAND),
            },
        ],
        [editor, runEditorCommand],
    );

    return (
        <div className="mb-2 flex items-center gap-1 border-b border-border/60 pb-2">
            {buttons.map((button) => (
                <Button
                    key={button.title}
                    type="button"
                    variant="ghost"
                    size="icon"
                    title={button.title}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={button.onClick}
                >
                    {button.icon}
                </Button>
            ))}
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-2 h-8 text-xs text-muted-foreground hover:text-foreground"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => runEditorCommand(REMOVE_LIST_COMMAND)}
            >
                Remove list
            </Button>
        </div>
    );
}

interface EditorBridgeProps {
    onEditorReady: (editor: LexicalEditor) => void;
    onSend: () => void;
    initialHtml?: string;
    sendShortcut: MessageSendShortcut;
}

function EditorBridge({
    onEditorReady,
    onSend,
    initialHtml,
    sendShortcut,
}: EditorBridgeProps) {
    const [editor] = useLexicalComposerContext();
    const lastHydratedHtmlRef = useRef<string | null>(null);

    useEffect(() => {
        onEditorReady(editor);
    }, [editor, onEditorReady]);

    useEffect(() => {
        return editor.registerCommand<KeyboardEvent>(
            KEY_ENTER_COMMAND,
            (event) => {
                const shouldSend =
                    sendShortcut === "enter"
                        ? !event.shiftKey && !event.ctrlKey && !event.metaKey
                        : event.ctrlKey || event.metaKey;

                if (!shouldSend) {
                    return false;
                }
                event.preventDefault();
                onSend();
                return true;
            },
            COMMAND_PRIORITY_EDITOR,
        );
    }, [editor, onSend, sendShortcut]);

    useEffect(() => {
        const normalizedHtml = initialHtml?.trim() ?? "";

        if (!normalizedHtml) {
            if (lastHydratedHtmlRef.current === "") {
                return;
            }
            lastHydratedHtmlRef.current = "";
            editor.update(() => {
                const root = $getRoot();
                root.clear();
                root.append($createParagraphNode());
            });
            return;
        }

        if (lastHydratedHtmlRef.current === normalizedHtml) {
            return;
        }

        lastHydratedHtmlRef.current = normalizedHtml;

        editor.update(() => {
            const root = $getRoot();
            root.clear();
            const dom = new DOMParser().parseFromString(normalizedHtml, "text/html");
            const nodes = $generateNodesFromDOM(editor, dom);
            if (nodes.length > 0) {
                root.append(...nodes);
            } else {
                root.append($createParagraphNode());
            }
        });
    }, [editor, initialHtml]);

    return null;
}

export const RichTextMessageEditor = forwardRef<
    RichTextMessageEditorRef,
    RichTextMessageEditorProps
>(({ initialHtml, onChange, onSend, mode = "editor", sendShortcut = "enter" }, ref) => {
    const editorRef = useRef<LexicalEditor | null>(null);

    const editorConfig = useMemo<InitialConfigType>(
        () => ({
            namespace: "chat-message-editor",
            theme: editorTheme,
            nodes: [ListNode, ListItemNode],
            onError(error: Error) {
                throw error;
            },
        }),
        [],
    );

    const handleStateChange = useCallback(
        (editorState: EditorState, lexicalEditor: LexicalEditor) => {
            editorState.read(() => {
                const text = $getRoot().getTextContent().trim();
                const html = $generateHtmlFromNodes(lexicalEditor, null).trim();
                onChange(html, text);
            });
        },
        [onChange],
    );

    useImperativeHandle(
        ref,
        () => ({
            clear: () => {
                const editor = editorRef.current;
                if (!editor) {
                    return;
                }
                editor.update(() => {
                    const root = $getRoot();
                    root.clear();
                });
                onChange("", "");
            },
            focus: () => {
                editorRef.current?.focus();
            },
            insertText: (text: string) => {
                const editor = editorRef.current;
                if (!editor) {
                    return;
                }
                editor.update(() => {
                    const selection = $getSelection();
                    selection?.insertText(text);
                });
                editor.focus();
            },
            getContent: () => {
                const editor = editorRef.current;
                if (!editor) {
                    return { html: "", text: "" };
                }
                let html = "";
                let text = "";
                editor.getEditorState().read(() => {
                    text = $getRoot().getTextContent().trim();
                    html = $generateHtmlFromNodes(editor, null).trim();
                });
                return { html, text };
            },
        }),
        [onChange],
    );

    return (
        <div
            className={cn(
                "rounded-xl border border-border bg-background/60 px-3 py-2",
                mode === "editor" && "min-h-28",
            )}
        >
            <LexicalComposer initialConfig={editorConfig}>
                <EditorBridge
                    onEditorReady={(editor) => (editorRef.current = editor)}
                    onSend={onSend}
                    initialHtml={initialHtml}
                    sendShortcut={sendShortcut}
                />
                <EditorToolbar />
                <RichTextPlugin
                    contentEditable={
                        <ContentEditable className="min-h-14 text-[15px] leading-relaxed outline-none" />
                    }
                    placeholder={
                        <div className="pointer-events-none text-[15px] text-muted-foreground/60">
                            {PLACEHOLDER_TEXT}
                        </div>
                    }
                    ErrorBoundary={LexicalErrorBoundary}
                />
                <OnChangePlugin onChange={handleStateChange} />
                <ListPlugin />
                <HistoryPlugin />
            </LexicalComposer>
        </div>
    );
});

RichTextMessageEditor.displayName = "RichTextMessageEditor";
