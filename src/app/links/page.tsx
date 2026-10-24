import { PageHeader } from "@/components/page-header";
import { LinkBuilder } from "./link-builder";

export default function LinksPage() {
  return (
    <>
      <PageHeader
        title="Tracked links"
        description="Tag links in ads, emails and social posts so each visit can be traced to its campaign."
      />
      <LinkBuilder />
    </>
  );
}
