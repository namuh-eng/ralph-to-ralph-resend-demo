export default async function TemplateEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#F0F0F0]">Template Editor</h1>
      <p className="text-[14px] text-[#A1A4A5] mt-2">Editing template {id}</p>
    </div>
  );
}
