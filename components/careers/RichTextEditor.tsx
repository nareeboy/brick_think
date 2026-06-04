'use client';

import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useState } from 'react';

// WYSIWYG editor for the role description. Emits HTML into a hidden input
// (`name`) so the surrounding <form> submits it to the server action, which
// sanitizes before storing (see lib/careers/sanitizeHtml.ts). The editor-side
// link config is for UX only — the server sanitizer is the security gate.
export function RichTextEditor({ name, initialHtml = '' }: { name: string; initialHtml?: string }) {
  const [html, setHtml] = useState(initialHtml);

  const editor = useEditor({
    immediatelyRender: false, // required: avoids SSR hydration mismatch in Next
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          protocols: ['http', 'https', 'mailto'],
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        },
      }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class: 'article-prose min-h-[220px] px-4 py-3 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      // An "empty" editor still serialises to "<p></p>"; store '' instead.
      setHtml(editor.isEmpty ? '' : editor.getHTML());
    },
  });

  return (
    <div className="rounded-md border border-zinc-300 bg-white focus-within:border-[#c0613d] focus-within:ring-1 focus-within:ring-[#c0613d]">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={html} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) {
    return <div className="h-[42px] border-b border-zinc-200" aria-hidden="true" />;
  }

  function setLink() {
    if (!editor) return;
    const previous = (editor.getAttributes('link').href as string | undefined) ?? '';
    const url = window.prompt('Link URL (https://… or mailto:…)', previous);
    if (url === null) return; // cancelled
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 px-2 py-1.5">
      <Btn
        label="B"
        title="Bold"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        bold
      />
      <Btn
        label="I"
        title="Italic"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        italic
      />
      <Divider />
      <Btn
        label="H2"
        title="Heading 2"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <Btn
        label="H3"
        title="Heading 3"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />
      <Divider />
      <Btn
        label="• List"
        title="Bullet list"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <Btn
        label="1. List"
        title="Numbered list"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <Btn
        label="❝"
        title="Quote"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      <Btn label="Link" title="Add/edit link" active={editor.isActive('link')} onClick={setLink} />
      <Divider />
      <Btn label="↶" title="Undo" onClick={() => editor.chain().focus().undo().run()} />
      <Btn label="↷" title="Redo" onClick={() => editor.chain().focus().redo().run()} />
    </div>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-zinc-200" aria-hidden="true" />;
}

function Btn({
  label,
  title,
  active = false,
  bold = false,
  italic = false,
  onClick,
}: {
  label: string;
  title: string;
  active?: boolean;
  bold?: boolean;
  italic?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={`cursor-pointer rounded px-2 py-1 text-xs transition-colors ${
        active ? 'bg-[#c0613d]/10 text-[#c0613d]' : 'text-zinc-700 hover:bg-zinc-900/5'
      } ${bold ? 'font-bold' : ''} ${italic ? 'italic' : ''}`}
    >
      {label}
    </button>
  );
}
