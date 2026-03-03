"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { useCallback, useState } from "react";

interface LessonContentProps {
    content: string;
}

/** Copy-to-clipboard button for code blocks */
function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [text]);

    return (
        <button
            onClick={handleCopy}
            className="absolute top-2 right-2 px-2 py-1 text-[10px] font-medium rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white transition-all opacity-0 group-hover:opacity-100"
            title="Copy code"
        >
            {copied ? "✓ Copied" : "Copy"}
        </button>
    );
}

export default function LessonContent({ content }: LessonContentProps) {
    return (
        <div className="lesson-content">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                    // Headers
                    h1: ({ children }) => (
                        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 mt-6 first:mt-0 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                            {children}
                        </h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-3 mt-5 first:mt-0 flex items-center gap-2">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-base font-semibold text-zinc-700 dark:text-zinc-300 mb-2 mt-4 first:mt-0">
                            {children}
                        </h3>
                    ),

                    // Paragraphs
                    p: ({ children }) => (
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-3 leading-relaxed">
                            {children}
                        </p>
                    ),

                    // Inline code — SQL keywords pop
                    code: ({ className, children, ...props }) => {
                        const isBlock = className?.includes("language-") || className?.includes("hljs");
                        if (isBlock) {
                            // Block code — rendered by <pre> wrapper
                            return <code className={className} {...props}>{children}</code>;
                        }
                        // Inline code keyword styling
                        return (
                            <code className="inline-code-keyword" {...props}>
                                {children}
                            </code>
                        );
                    },

                    // Code blocks
                    pre: ({ children, ...props }) => {
                        // Extract text from children for copy button
                        let codeText = "";
                        const extractText = (node: any): string => {
                            if (typeof node === "string") return node;
                            if (node?.props?.children) {
                                if (Array.isArray(node.props.children)) {
                                    return node.props.children.map(extractText).join("");
                                }
                                return extractText(node.props.children);
                            }
                            return "";
                        };
                        if (Array.isArray(children)) {
                            codeText = children.map(extractText).join("");
                        } else {
                            codeText = extractText(children);
                        }

                        return (
                            <div className="code-block-wrapper group">
                                <CopyButton text={codeText.trim()} />
                                <pre className="code-block" {...props}>
                                    {children}
                                </pre>
                            </div>
                        );
                    },

                    // Lists
                    ul: ({ children }) => (
                        <ul className="lesson-list lesson-list-unordered">
                            {children}
                        </ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="lesson-list lesson-list-ordered">
                            {children}
                        </ol>
                    ),
                    li: ({ children }) => (
                        <li className="lesson-list-item">
                            {children}
                        </li>
                    ),

                    // Tables
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                            <table className="lesson-table">
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead className="bg-zinc-100 dark:bg-zinc-800">
                            {children}
                        </thead>
                    ),
                    th: ({ children }) => (
                        <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 border-t border-zinc-100 dark:border-zinc-800">
                            {children}
                        </td>
                    ),

                    // Blockquotes — render as callout boxes
                    blockquote: ({ children }) => {
                        // Detect callout type from content
                        const textContent = extractTextContent(children);
                        if (textContent.startsWith("💡")) {
                            return (
                                <div className="callout callout-tip">
                                    <div className="callout-content">{children}</div>
                                </div>
                            );
                        }
                        if (textContent.startsWith("⚠️") || textContent.startsWith("⚠")) {
                            return (
                                <div className="callout callout-warning">
                                    <div className="callout-content">{children}</div>
                                </div>
                            );
                        }
                        if (textContent.startsWith("📝")) {
                            return (
                                <div className="callout callout-note">
                                    <div className="callout-content">{children}</div>
                                </div>
                            );
                        }
                        return (
                            <div className="callout callout-default">
                                <div className="callout-content">{children}</div>
                            </div>
                        );
                    },

                    // Strong / Bold
                    strong: ({ children }) => (
                        <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {children}
                        </strong>
                    ),

                    // Emphasis / Italic
                    em: ({ children }) => (
                        <em className="italic text-zinc-600 dark:text-zinc-400">
                            {children}
                        </em>
                    ),

                    // Horizontal rule
                    hr: () => (
                        <hr className="my-5 border-zinc-200 dark:border-zinc-800" />
                    ),

                    // Links
                    a: ({ href, children }) => (
                        <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                            {children}
                        </a>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}

/** Helper to extract text from React children for callout detection */
function extractTextContent(children: any): string {
    if (typeof children === "string") return children;
    if (Array.isArray(children)) {
        return children.map(extractTextContent).join("");
    }
    if (children?.props?.children) {
        return extractTextContent(children.props.children);
    }
    return "";
}
