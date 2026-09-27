import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentContext } from "@/lib/auth/context";
import { getPages, type MetaPage } from "@/lib/social/meta";
import { PAGE_PICK_COOKIE, decodePagePick } from "@/lib/social/oauth-state";
import { choosePage } from "../actions";

/** Shown after connecting when the owner manages more than one Facebook Page. */
export default async function ChoosePagePage() {
  await getCurrentContext();
  const pick = decodePagePick((await cookies()).get(PAGE_PICK_COOKIE)?.value);
  if (!pick) redirect("/social-accounts?error=expired");

  let pages: MetaPage[];
  try {
    pages = await getPages(pick.userToken);
  } catch (err) {
    console.error("Could not list Pages", err);
    redirect("/social-accounts?error=failed");
  }
  const instagram = pick.platform === "INSTAGRAM";
  const eligible = instagram ? pages.filter((p) => p.instagram_business_account) : pages;

  return (
    <div className="space-y-5 max-w-[640px]">
      <PageHeader
        title={instagram ? "Which Instagram account?" : "Which Facebook Page?"}
        subtitle={
          instagram
            ? "You manage several Pages with Instagram accounts. Pick the one for this business."
            : "You manage several Pages. Pick the one for this business."
        }
      />

      <ul className="bg-white rounded-[12px] border border-brand-line divide-y divide-brand-line">
        {eligible.map((page) => (
          <li key={page.id}>
            <form action={choosePage} className="flex items-center justify-between gap-4 px-5 py-4">
              <input type="hidden" name="pageId" value={page.id} />
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-brand-dark truncate">
                  {instagram ? `@${page.instagram_business_account!.username}` : page.name}
                </p>
                {instagram && <p className="text-[12px] text-brand-muted truncate">Linked to {page.name}</p>}
              </div>
              <button
                type="submit"
                className="shrink-0 px-3 py-2 rounded-[7px] bg-brand text-white text-[13px] font-semibold hover:opacity-90"
              >
                Connect
              </button>
            </form>
          </li>
        ))}
      </ul>

      <Link href="/social-accounts" className="text-[13px] font-semibold text-brand hover:underline">
        Cancel
      </Link>
    </div>
  );
}
