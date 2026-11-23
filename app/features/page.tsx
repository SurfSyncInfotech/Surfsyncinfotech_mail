import type { Metadata } from "next";
import { ButtonLink, Container, PageIntro } from "@/components/chrome";
import { DashboardCollage } from "@/components/DashboardCollage";
import { FeatureScenes } from "@/components/FeatureScenes";

export const metadata: Metadata = {
  title: "Platform",
};

const heroButton = "!h-[51px] !rounded-md !px-6 !text-[15px]";

export default function FeaturesPage() {
  return (
    <Container className="pb-20">
      <PageIntro
        crumb="Features"
        eyebrow="Platform features"
        title={
          <>
            Everything a business mailbox
            <br />
            should do
          </>
        }
        lead="From the first message on your domain to the admin controls behind it, SurfSync Mail covers the essentials your team uses every day — without bolting together separate products."
      >
        <ButtonLink href="/pricing" className={heroButton}>
          Get started
        </ButtonLink>
        <ButtonLink href="/pricing" variant="secondary" className={heroButton}>
          Compare plans
        </ButtonLink>
      </PageIntro>
      <div className="mt-12 lg:mt-16">
        <DashboardCollage />
      </div>
      <div className="mt-14">
        <FeatureScenes />
      </div>
    </Container>
  );
}
