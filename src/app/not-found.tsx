import Link from "next/link";
import { Notice } from "@/components/paper/Notice";
import { Shell } from "@/components/paper/Shell";

export default function NotFound() {
  return (
    <Shell nav={[{ href: "/", label: "Front desk" }]}>
      <Notice headline="We Have No Record of That Page" actions={<Link href="/" className="press-button">Back to the front desk</Link>}>
        It isn&rsquo;t in the archive, and the desk can&rsquo;t find it anywhere else either.
      </Notice>
    </Shell>
  );
}
