"use client";

interface TemplateDetailProps {
  template: {
    id: string;
    name: string;
    alias: string | null;
    from: string | null;
    subject: string | null;
    html: string | null;
    text: string | null;
    published: boolean;
    variables: Array<{ name: string; required: boolean }>;
    createdAt: string;
    updatedAt: string;
  };
}

export function TemplateDetail({ template }: TemplateDetailProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#F0F0F0]">
          {template.name}
        </h1>
        <span
          className={`text-xs px-2 py-1 rounded ${
            template.published
              ? "bg-green-900/30 text-green-400"
              : "bg-yellow-900/30 text-yellow-400"
          }`}
        >
          {template.published ? "Published" : "Draft"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm text-[#A1A4A5]">
        {template.alias && (
          <div>
            <span className="text-[#6B7071]">Alias:</span> {template.alias}
          </div>
        )}
        {template.from && (
          <div>
            <span className="text-[#6B7071]">From:</span> {template.from}
          </div>
        )}
        {template.subject && (
          <div>
            <span className="text-[#6B7071]">Subject:</span> {template.subject}
          </div>
        )}
        <div>
          <span className="text-[#6B7071]">Created:</span>{" "}
          {new Date(template.createdAt).toLocaleDateString()}
        </div>
        <div>
          <span className="text-[#6B7071]">Updated:</span>{" "}
          {new Date(template.updatedAt).toLocaleDateString()}
        </div>
      </div>

      {template.variables.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-[#A1A4A5] mb-2">Variables</h3>
          <div className="flex flex-wrap gap-2">
            {template.variables.map((v) => (
              <span
                key={v.name}
                className="text-xs px-2 py-1 rounded bg-[#1A1D1E] text-[#A1A4A5] border border-[rgba(176,199,217,0.1)]"
              >
                {`{{${v.name}}}`}
                {v.required && <span className="text-red-400 ml-1">*</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {template.html && (
        <div>
          <h3 className="text-sm font-medium text-[#A1A4A5] mb-2">
            HTML Preview
          </h3>
          <div className="border border-[rgba(176,199,217,0.1)] rounded-lg overflow-hidden bg-white">
            <iframe
              srcDoc={template.html}
              className="w-full min-h-[400px]"
              title="Template Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}

      {template.text && !template.html && (
        <div>
          <h3 className="text-sm font-medium text-[#A1A4A5] mb-2">
            Text Content
          </h3>
          <pre className="text-sm text-[#A1A4A5] bg-[#1A1D1E] p-4 rounded-lg whitespace-pre-wrap">
            {template.text}
          </pre>
        </div>
      )}
    </div>
  );
}
