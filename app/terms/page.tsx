import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms & Conditions · BrickThink',
  description:
    'The terms and conditions governing access to and use of the BrickThink website and platform.',
};

const LAST_UPDATED = '15 May 2026';

const SECTIONS = [
  'General terms',
  'License',
  'Meanings',
  'Restrictions',
  'Return and refund policy',
  'Your suggestions',
  'Your consent',
  'Links to other websites',
  'Cookies',
  'Changes to our Terms & Conditions',
  'Modifications to our website',
  'Updates to our website',
  'Third-party services',
  'Term and termination',
  'Copyright infringement notice',
  'Indemnification',
  'No warranties',
  'Limitation of liability',
  'Severability',
  'Waiver',
  'Amendments to this Agreement',
  'Entire Agreement',
  'Updates to our Terms',
  'Intellectual property',
  'Agreement to arbitrate',
  'Notice of dispute',
  'Binding arbitration',
  'Submissions and privacy',
  'Promotions',
  'Typographical errors',
  'Miscellaneous',
  'Disclaimer',
  'Contact us',
] as const;

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function TermsPage() {
  return (
    <div className="min-h-[100dvh] bg-[#FAF7F1] text-zinc-900">
      <LegalTopBar />
      <main
        id="main"
        className="mx-auto max-w-6xl px-6 py-12 md:py-20 lg:grid lg:grid-cols-12 lg:gap-12"
      >
        <aside className="hidden lg:col-span-3 lg:block">
          <TableOfContents ariaLabel="Terms & Conditions sections" />
        </aside>
        <div className="lg:col-span-9">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Legal · Last updated {LAST_UPDATED}
          </p>
          <h1 className="mt-3 font-display text-[44px] font-medium leading-[1.0] tracking-[-0.02em] text-zinc-950 md:text-[60px]">
            Terms &amp; Conditions
          </h1>

          <MobileTOC />

          <article className="mt-10 max-w-prose space-y-10 text-[15px] leading-relaxed text-zinc-700">
            <Section heading="General terms">
              <P>
                By accessing and placing an order with Brick Think, you confirm that you are in
                agreement with and bound by the terms of service contained in the Terms &amp;
                Conditions outlined below. These terms apply to the entire website and any email or
                other type of communication between you and Brick Think.
              </P>
              <P>
                Under no circumstances shall Brick Think team be liable for any direct, indirect,
                special, incidental, or consequential damages, including, but not limited to, loss
                of data or profit, arising out of the use, or the inability to use, the materials on
                this site, even if Brick Think team or an authorized representative has been advised
                of the possibility of such damages. If your use of materials from this site results
                in the need for servicing, repair, or correction of equipment or data, you assume
                any costs thereof.
              </P>
              <P>
                Brick Think will not be responsible for any outcome that may occur during the course
                of usage of our resources. We reserve the right to change prices and revise the
                resources usage policy at any moment.
              </P>
            </Section>

            <Section heading="License">
              <P>
                Brick Think grants you a revocable, non-exclusive, non-transferable, limited license
                to download, install, and use the website strictly in accordance with the terms of
                this Agreement.
              </P>
              <P>
                These Terms &amp; Conditions are a contract between you and Brick Think (referred to
                in these Terms &amp; Conditions as &ldquo;Brick Think&rdquo;, &ldquo;us&rdquo;,
                &ldquo;we&rdquo;, or &ldquo;our&rdquo;), the provider of the Brick Think website and
                the services accessible from the Brick Think website (which are collectively
                referred to in these Terms &amp; Conditions as the &ldquo;Brick Think
                Service&rdquo;).
              </P>
              <P>
                You are agreeing to be bound by these Terms &amp; Conditions. If you do not agree to
                these Terms &amp; Conditions, please do not use the Brick Think Service. In these
                Terms &amp; Conditions, &ldquo;you&rdquo; refers both to you as an individual and to
                the entity you represent. If you violate any of these Terms &amp; Conditions, we
                reserve the right to cancel your account or block access to your account without
                notice.
              </P>
            </Section>

            <Section heading="Meanings">
              <P>For these Terms &amp; Conditions:</P>
              <UL>
                <li>
                  <Em>Cookie:</Em> small amount of data generated by a website and saved by your web
                  browser. It is used to identify your browser, provide analytics, remember
                  information about you such as your language preference or login information.
                </li>
                <li>
                  <Em>Company:</Em> when this policy mentions &ldquo;Company,&rdquo;
                  &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our,&rdquo; it refers to Brick
                  Think, that is responsible for your information under this Terms &amp; Conditions.
                </li>
                <li>
                  <Em>Country:</Em> where Brick Think or the owners/founders of Brick Think are
                  based, in this case Switzerland.
                </li>
                <li>
                  <Em>Device:</Em> any internet-connected device such as a phone, tablet, computer
                  or any other device that can be used to visit Brick Think and use the services.
                </li>
                <li>
                  <Em>Service:</Em> refers to the service provided by Brick Think as described in
                  the relative terms (if available) and on this platform.
                </li>
                <li>
                  <Em>Third-party service:</Em> refers to advertisers, contest sponsors, promotional
                  and marketing partners, and others who provide our content or whose products or
                  services we think may interest you.
                </li>
                <li>
                  <Em>Website:</Em> Brick Think&apos;s site, which can be accessed via this URL:{' '}
                  <a
                    href="https://www.brickthink.io/"
                    className="underline-offset-2 hover:underline"
                  >
                    https://www.brickthink.io/
                  </a>
                  .
                </li>
                <li>
                  <Em>You:</Em> a person or entity that is registered with Brick Think to use the
                  Services.
                </li>
              </UL>
            </Section>

            <Section heading="Restrictions">
              <P>You agree not to, and you will not permit others to:</P>
              <UL>
                <li>
                  License, sell, rent, lease, assign, distribute, transmit, host, outsource,
                  disclose, or otherwise commercially exploit the website or make the platform
                  available to any third party.
                </li>
                <li>
                  Modify, make derivative works of, disassemble, decrypt, reverse compile, or
                  reverse engineer any part of the website.
                </li>
                <li>
                  Remove, alter, or obscure any proprietary notice (including any notice of
                  copyright or trademark) of Brick Think or its affiliates, partners, suppliers, or
                  the licensors of the website.
                </li>
              </UL>
            </Section>

            <Section heading="Return and refund policy">
              <P>
                Thanks for shopping at Brick Think. We appreciate the fact that you like to buy the
                stuff we build. We also want to make sure you have a rewarding experience while
                you&apos;re exploring, evaluating, and purchasing our products.
              </P>
              <P>
                As with any shopping experience, there are terms and conditions that apply to
                transactions at Brick Think. We&apos;ll be as brief as our attorneys will allow. The
                main thing to remember is that by placing an order or making a purchase at Brick
                Think, you agree to the terms along with Brick Think&apos;s Privacy Policy.
              </P>
              <P>
                If, for any reason, you are not completely satisfied with any good or service that
                we provide, don&apos;t hesitate to contact us and we will discuss any of the issues
                you are going through with our product.
              </P>
            </Section>

            <Section heading="Your suggestions">
              <P>
                Any feedback, comments, ideas, improvements, or suggestions (collectively,
                &ldquo;Suggestions&rdquo;) provided by you to Brick Think with respect to the
                website shall remain the sole and exclusive property of Brick Think.
              </P>
              <P>
                Brick Think shall be free to use, copy, modify, publish, or redistribute the
                Suggestions for any purpose and in any way without any credit or any compensation to
                you.
              </P>
            </Section>

            <Section heading="Your consent">
              <P>
                We&apos;ve updated our Terms &amp; Conditions to provide you with complete
                transparency into what is being set when you visit our site and how it&apos;s being
                used. By using our website, registering an account, or making a purchase, you hereby
                consent to our Terms &amp; Conditions.
              </P>
            </Section>

            <Section heading="Links to other websites">
              <P>
                This Terms &amp; Conditions applies only to the Services. The Services may contain
                links to other websites not operated or controlled by Brick Think. We are not
                responsible for the content, accuracy, or opinions expressed in such websites, and
                such websites are not investigated, monitored, or checked for accuracy or
                completeness by us. Please remember that when you use a link to go from the Services
                to another website, our Terms &amp; Conditions are no longer in effect. Your
                browsing and interaction on any other website, including those that have a link on
                our platform, is subject to that website&apos;s own rules and policies. Such third
                parties may use their own cookies or other methods to collect information about you.
              </P>
            </Section>

            <Section heading="Cookies">
              <P>
                Brick Think uses &ldquo;Cookies&rdquo; to identify the areas of our website that you
                have visited. A Cookie is a small piece of data stored on your computer or mobile
                device by your web browser. We use Cookies to enhance the performance and
                functionality of our website but are non-essential to their use. However, without
                these cookies, certain functionality like videos may become unavailable or you would
                be required to enter your login details every time you visit the website as we would
                not be able to remember that you had logged in previously. Most web browsers can be
                set to disable the use of Cookies. However, if you disable Cookies, you may not be
                able to access functionality on our website correctly or at all. We never place
                Personally Identifiable Information in Cookies.
              </P>
            </Section>

            <Section heading="Changes to our Terms & Conditions">
              <P>
                You acknowledge and agree that Brick Think may stop (permanently or temporarily)
                providing the Service (or any features within the Service) to you or to users
                generally at Brick Think&apos;s sole discretion, without prior notice to you. You
                may stop using the Service at any time. You do not need to specifically inform Brick
                Think when you stop using the Service. You acknowledge and agree that if Brick Think
                disables access to your account, you may be prevented from accessing the Service,
                your account details, or any files or other materials which are contained in your
                account.
              </P>
              <P>
                If we decide to change our Terms &amp; Conditions, we will post those changes on
                this page, and/or update the Terms &amp; Conditions modification date above.
              </P>
            </Section>

            <Section heading="Modifications to our website">
              <P>
                Brick Think reserves the right to modify, suspend, or discontinue, temporarily or
                permanently, the website or any service to which it connects, with or without notice
                and without liability to you.
              </P>
            </Section>

            <Section heading="Updates to our website">
              <P>
                Brick Think may from time to time provide enhancements or improvements to the
                features/functionality of the website, which may include patches, bug fixes,
                updates, upgrades, and other modifications (&ldquo;Updates&rdquo;).
              </P>
              <P>
                Updates may modify or delete certain features and/or functionalities of the website.
                You agree that Brick Think has no obligation to (i) provide any Updates, or (ii)
                continue to provide or enable any particular features and/or functionalities of the
                website to you.
              </P>
              <P>
                You further agree that all Updates will be (i) deemed to constitute an integral part
                of the website, and (ii) subject to the terms and conditions of this Agreement.
              </P>
            </Section>

            <Section heading="Third-party services">
              <P>
                We may display, include, or make available third-party content (including data,
                information, applications, and other products services) or provide links to
                third-party websites or services (&ldquo;Third-Party Services&rdquo;).
              </P>
              <P>
                You acknowledge and agree that Brick Think shall not be responsible for any
                Third-Party Services, including their accuracy, completeness, timeliness, validity,
                copyright compliance, legality, decency, quality, or any other aspect thereof. Brick
                Think does not assume and shall not have any liability or responsibility to you or
                any other person or entity for any Third-Party Services.
              </P>
              <P>
                Third-Party Services and links thereto are provided solely as a convenience to you
                and you access and use them entirely at your own risk and subject to such third
                parties&apos; terms and conditions.
              </P>
            </Section>

            <Section heading="Term and termination">
              <P>This Agreement shall remain in effect until terminated by you or Brick Think.</P>
              <P>
                Brick Think may, in its sole discretion, at any time and for any or no reason,
                suspend or terminate this Agreement with or without prior notice.
              </P>
              <P>
                This Agreement will terminate immediately, without prior notice from Brick Think, in
                the event that you fail to comply with any provision of this Agreement. You may also
                terminate this Agreement by deleting the website and all copies thereof from your
                computer.
              </P>
              <P>
                Upon termination of this Agreement, you shall cease all use of the website and
                delete all copies of the website from your computer. Termination of this Agreement
                will not limit any of Brick Think&apos;s rights or remedies at law or in equity in
                case of breach by you (during the term of this Agreement) of any of your obligations
                under the present Agreement.
              </P>
            </Section>

            <Section heading="Copyright infringement notice">
              <P>
                If you are a copyright owner or such owner&apos;s agent and believe any material on
                our website constitutes an infringement on your copyright, please contact us setting
                forth the following information: (a) a physical or electronic signature of the
                copyright owner or a person authorized to act on his behalf; (b) identification of
                the material that is claimed to be infringing; (c) your contact information,
                including your address, telephone number, and an email; (d) a statement by you that
                you have a good faith belief that use of the material is not authorized by the
                copyright owners; and (e) the statement that the information in the notification is
                accurate, and, under penalty of perjury, you are authorized to act on behalf of the
                owner.
              </P>
            </Section>

            <Section heading="Indemnification">
              <P>
                You agree to indemnify and hold Brick Think and its parents, subsidiaries,
                affiliates, officers, employees, agents, partners, and licensors (if any) harmless
                from any claim or demand, including reasonable attorneys&apos; fees, due to or
                arising out of your: (a) use of the website; (b) violation of this Agreement or any
                law or regulation; or (c) violation of any right of a third party.
              </P>
            </Section>

            <Section heading="No warranties">
              <P>
                The website is provided to you &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo;
                and with all faults and defects without warranty of any kind. To the maximum extent
                permitted under applicable law, Brick Think, on its own behalf and on behalf of its
                affiliates and its and their respective licensors and service providers, expressly
                disclaims all warranties, whether express, implied, statutory, or otherwise, with
                respect to the website, including all implied warranties of merchantability, fitness
                for a particular purpose, title, and non-infringement, and warranties that may arise
                out of course of dealing, course of performance, usage, or trade practice. Without
                limitation to the foregoing, Brick Think provides no warranty or undertaking, and
                makes no representation of any kind that the website will meet your requirements,
                achieve any intended results, be compatible or work with any other software,
                systems, or services, operate without interruption, meet any performance or
                reliability standards, or be error free or that any errors or defects can or will be
                corrected.
              </P>
              <P>
                Without limiting the foregoing, neither Brick Think nor any Brick Think&apos;s
                provider makes any representation or warranty of any kind, express or implied: (i)
                as to the operation or availability of the website, or the information, content, and
                materials or products included thereon; (ii) that the website will be uninterrupted
                or error-free; (iii) as to the accuracy, reliability, or currency of any information
                or content provided through the website; or (iv) that the website, its servers, the
                content, or e-mails sent from or on behalf of Brick Think are free of viruses,
                scripts, trojan horses, worms, malware, timebombs, or other harmful components.
              </P>
              <P>
                Some jurisdictions do not allow the exclusion of or limitations on implied
                warranties or the limitations on the applicable statutory rights of a consumer, so
                some or all of the above exclusions and limitations may not apply to you.
              </P>
            </Section>

            <Section heading="Limitation of liability">
              <P>
                Notwithstanding any damages that you might incur, the entire liability of Brick
                Think and any of its suppliers under any provision of this Agreement and your
                exclusive remedy for all of the foregoing shall be limited to the amount actually
                paid by you for the website.
              </P>
              <P>
                To the maximum extent permitted by applicable law, in no event shall Brick Think or
                its suppliers be liable for any special, incidental, indirect, or consequential
                damages whatsoever (including, but not limited to, damages for loss of profits, for
                loss of data or other information, for business interruption, for personal injury,
                for loss of privacy arising out of or in any way related to the use of or inability
                to use the website, third-party software, and/or third-party hardware used with the
                website, or otherwise in connection with any provision of this Agreement), even if
                Brick Think or any supplier has been advised of the possibility of such damages and
                even if the remedy fails of its essential purpose.
              </P>
              <P>
                Some states/jurisdictions do not allow the exclusion or limitation of incidental or
                consequential damages, so the above limitation or exclusion may not apply to you.
              </P>
            </Section>

            <Section heading="Severability">
              <P>
                If any provision of this Agreement is held to be unenforceable or invalid, such
                provision will be changed and interpreted to accomplish the objectives of such
                provision to the greatest extent possible under applicable law and the remaining
                provisions will continue in full force and effect.
              </P>
              <P>
                This Agreement, together with the Privacy Policy and any other legal notices
                published by Brick Think on the Services, shall constitute the entire agreement
                between you and Brick Think concerning the Services. If any provision of this
                Agreement is deemed invalid by a court of competent jurisdiction, the invalidity of
                such provision shall not affect the validity of the remaining provisions of this
                Agreement, which shall remain in full force and effect. No waiver of any term of
                this Agreement shall be deemed a further or continuing waiver of such term or any
                other term, and Brick Think&apos;s failure to assert any right or provision under
                this Agreement shall not constitute a waiver of such right or provision. YOU AND
                BRICK THINK AGREE THAT ANY CAUSE OF ACTION ARISING OUT OF OR RELATED TO THE SERVICES
                MUST COMMENCE WITHIN ONE (1) YEAR AFTER THE CAUSE OF ACTION ACCRUES. OTHERWISE, SUCH
                CAUSE OF ACTION IS PERMANENTLY BARRED.
              </P>
            </Section>

            <Section heading="Waiver">
              <P>
                Except as provided herein, the failure to exercise a right or to require performance
                of an obligation under this Agreement shall not effect a party&apos;s ability to
                exercise such right or require such performance at any time thereafter nor shall the
                waiver of a breach constitute waiver of any subsequent breach.
              </P>
              <P>
                No failure to exercise, and no delay in exercising, on the part of either party, any
                right or any power under this Agreement shall operate as a waiver of that right or
                power. Nor shall any single or partial exercise of any right or power under this
                Agreement preclude further exercise of that or any other right granted herein. In
                the event of a conflict between this Agreement and any applicable purchase or other
                terms, the terms of this Agreement shall govern.
              </P>
            </Section>

            <Section heading="Amendments to this Agreement">
              <P>
                Brick Think reserves the right, at its sole discretion, to modify or replace this
                Agreement at any time. If a revision is material we will provide at least 30
                days&apos; notice prior to any new terms taking effect. What constitutes a material
                change will be determined at our sole discretion.
              </P>
              <P>
                By continuing to access or use our website after any revisions become effective, you
                agree to be bound by the revised terms. If you do not agree to the new terms, you
                are no longer authorized to use Brick Think.
              </P>
            </Section>

            <Section heading="Entire Agreement">
              <P>
                The Agreement constitutes the entire agreement between you and Brick Think regarding
                your use of the website and supersedes all prior and contemporaneous written or oral
                agreements between you and Brick Think.
              </P>
              <P>
                You may be subject to additional terms and conditions that apply when you use or
                purchase other Brick Think&apos;s services, which Brick Think will provide to you at
                the time of such use or purchase.
              </P>
            </Section>

            <Section heading="Updates to our Terms">
              <P>
                We may change our Service and policies, and we may need to make changes to these
                Terms so that they accurately reflect our Service and policies. Unless otherwise
                required by law, we will notify you (for example, through our Service) before we
                make changes to these Terms and give you an opportunity to review them before they
                go into effect. Then, if you continue to use the Service, you will be bound by the
                updated Terms. If you do not want to agree to these or any updated Terms, you can
                delete your account.
              </P>
            </Section>

            <Section heading="Intellectual property">
              <P>
                The website and its entire contents, features, and functionality (including but not
                limited to all information, software, text, displays, images, video and audio, and
                the design, selection, and arrangement thereof), are owned by Brick Think, its
                licensors, or other providers of such material and are protected by Switzerland and
                international copyright, trademark, patent, trade secret, and other intellectual
                property or proprietary rights laws. The material may not be copied, modified,
                reproduced, downloaded, or distributed in any way, in whole or in part, without the
                express prior written permission of Brick Think, unless and except as is expressly
                provided in these Terms &amp; Conditions. Any unauthorized use of the material is
                prohibited.
              </P>
            </Section>

            <Section heading="Agreement to arbitrate">
              <P>
                This section applies to any dispute EXCEPT IT DOESN&apos;T INCLUDE A DISPUTE
                RELATING TO CLAIMS FOR INJUNCTIVE OR EQUITABLE RELIEF REGARDING THE ENFORCEMENT OR
                VALIDITY OF YOUR OR BRICK THINK&apos;S INTELLECTUAL PROPERTY RIGHTS. The term
                &ldquo;dispute&rdquo; means any dispute, action, or other controversy between you
                and Brick Think concerning the Services or this agreement, whether in contract,
                warranty, tort, statute, regulation, ordinance, or any other legal or equitable
                basis. &ldquo;Dispute&rdquo; will be given the broadest possible meaning allowable
                under law.
              </P>
            </Section>

            <Section heading="Notice of dispute">
              <P>
                In the event of a dispute, you or Brick Think must give the other a Notice of
                Dispute, which is a written statement that sets forth the name, address, and contact
                information of the party giving it, the facts giving rise to the dispute, and the
                relief requested. You must send any Notice of Dispute via email to:{' '}
                <a
                  href="mailto:privacy@brickthink.io"
                  className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                >
                  privacy@brickthink.io
                </a>
                . Brick Think will send any Notice of Dispute to you by mail to your address if we
                have it, or otherwise to your email address. You and Brick Think will attempt to
                resolve any dispute through informal negotiation within sixty (60) days from the
                date the Notice of Dispute is sent. After sixty (60) days, you or Brick Think may
                commence arbitration.
              </P>
            </Section>

            <Section heading="Binding arbitration">
              <P>
                If you and Brick Think don&apos;t resolve any dispute by informal negotiation, any
                other effort to resolve the dispute will be conducted exclusively by binding
                arbitration as described in this section. You are giving up the right to litigate
                (or participate in as a party or class member) all disputes in court before a judge
                or jury. The dispute shall be settled by binding arbitration in accordance with the
                commercial arbitration rules of the American Arbitration Association. Either party
                may seek any interim or preliminary injunctive relief from any court of competent
                jurisdiction, as necessary to protect the party&apos;s rights or property pending
                the completion of arbitration. Any and all legal, accounting, and other costs, fees,
                and expenses incurred by the prevailing party shall be borne by the non-prevailing
                party.
              </P>
            </Section>

            <Section heading="Submissions and privacy">
              <P>
                In the event that you submit or post any ideas, creative suggestions, designs,
                photographs, information, advertisements, data, or proposals, including ideas for
                new or improved products, services, features, technologies, or promotions, you
                expressly agree that such submissions will automatically be treated as
                non-confidential and non-proprietary and will become the sole property of Brick
                Think without any compensation or credit to you whatsoever. Brick Think and its
                affiliates shall have no obligations with respect to such submissions or posts and
                may use the ideas contained in such submissions or posts for any purposes in any
                medium in perpetuity, including, but not limited to, developing, manufacturing, and
                marketing products and services using such ideas.
              </P>
            </Section>

            <Section heading="Promotions">
              <P>
                Brick Think may, from time to time, include contests, promotions, sweepstakes, or
                other activities (&ldquo;Promotions&rdquo;) that require you to submit material or
                information concerning yourself. Please note that all Promotions may be governed by
                separate rules that may contain certain eligibility requirements, such as
                restrictions as to age and geographic location. You are responsible to read all
                Promotions rules to determine whether or not you are eligible to participate. If you
                enter any Promotion, you agree to abide by and to comply with all Promotions Rules.
              </P>
              <P>
                Additional terms and conditions may apply to purchases of goods or services on or
                through the Services, which terms and conditions are made a part of this Agreement
                by this reference.
              </P>
            </Section>

            <Section heading="Typographical errors">
              <P>
                In the event a product and/or service is listed at an incorrect price or with
                incorrect information due to typographical error, we shall have the right to refuse
                or cancel any orders placed for the product and/or service listed at the incorrect
                price. We shall have the right to refuse or cancel any such order whether or not the
                order has been confirmed and your credit card charged. If your credit card has
                already been charged for the purchase and your order is canceled, we shall
                immediately issue a credit to your credit card account or other payment account in
                the amount of the charge.
              </P>
            </Section>

            <Section heading="Miscellaneous">
              <P>
                If for any reason a court of competent jurisdiction finds any provision or portion
                of these Terms &amp; Conditions to be unenforceable, the remainder of these Terms
                &amp; Conditions will continue in full force and effect. Any waiver of any provision
                of these Terms &amp; Conditions will be effective only if in writing and signed by
                an authorized representative of Brick Think. Brick Think will be entitled to
                injunctive or other equitable relief (without the obligations of posting any bond or
                surety) in the event of any breach or anticipatory breach by you. Brick Think
                operates and controls the Brick Think Service from its offices in Switzerland. The
                Service is not intended for distribution to or use by any person or entity in any
                jurisdiction or country where such distribution or use would be contrary to law or
                regulation. Accordingly, those persons who choose to access the Brick Think Service
                from other locations do so on their own initiative and are solely responsible for
                compliance with local laws, if and to the extent local laws are applicable. These
                Terms &amp; Conditions (which include and incorporate the Brick Think Privacy
                Policy) contain the entire understanding, and supersede all prior understandings,
                between you and Brick Think concerning its subject matter, and cannot be changed or
                modified by you. The section headings used in this Agreement are for convenience
                only and will not be given any legal import.
              </P>
            </Section>

            <Section heading="Disclaimer">
              <P>Brick Think is not responsible for any content, code, or any other imprecision.</P>
              <P>Brick Think does not provide warranties or guarantees.</P>
              <P>
                In no event shall Brick Think be liable for any special, direct, indirect,
                consequential, or incidental damages or any damages whatsoever, whether in an action
                of contract, negligence, or other tort, arising out of or in connection with the use
                of the Service or the contents of the Service. Brick Think reserves the right to
                make additions, deletions, or modifications to the contents on the Service at any
                time without prior notice.
              </P>
              <P>
                The Brick Think Service and its contents are provided &ldquo;as is&rdquo; and
                &ldquo;as available&rdquo; without any warranty or representations of any kind,
                whether express or implied. Brick Think is a distributor and not a publisher of the
                content supplied by third parties; as such, Brick Think exercises no editorial
                control over such content and makes no warranty or representation as to the
                accuracy, reliability, or currency of any information, content, service, or
                merchandise provided through or accessible via the Brick Think Service. Without
                limiting the foregoing, Brick Think specifically disclaims all warranties and
                representations in any content transmitted on or in connection with the Brick Think
                Service or on sites that may appear as links on the Brick Think Service, or in the
                products provided as a part of, or otherwise in connection with, the Brick Think
                Service, including without limitation any warranties of merchantability, fitness for
                a particular purpose, or non-infringement of third party rights. No oral advice or
                written information given by Brick Think or any of its affiliates, employees,
                officers, directors, agents, or the like will create a warranty. Price and
                availability information is subject to change without notice. Without limiting the
                foregoing, Brick Think does not warrant that the Brick Think Service will be
                uninterrupted, uncorrupted, timely, or error-free.
              </P>
            </Section>

            <Section heading="Contact us">
              <P>Don&apos;t hesitate to contact us if you have any questions.</P>
              <P>
                Via email:{' '}
                <a
                  href="mailto:privacy@brickthink.io"
                  className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                >
                  privacy@brickthink.io
                </a>
              </P>
            </Section>
          </article>

          <LegalFooterNav />
        </div>
      </main>
    </div>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section id={slug(heading)} className="scroll-mt-24 space-y-4">
      <h2 className="font-display text-[28px] font-medium leading-[1.1] tracking-[-0.01em] text-zinc-950 md:text-[32px]">
        {heading}
      </h2>
      {children}
    </section>
  );
}

function TableOfContents({ ariaLabel }: { ariaLabel: string }) {
  return (
    <nav
      aria-label={ariaLabel}
      className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto py-2 pr-2"
    >
      <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        On this page
      </p>
      <ol className="space-y-1.5">
        {SECTIONS.map((s, i) => (
          <li key={s} className="flex items-baseline gap-2 text-[13px] leading-snug text-zinc-600">
            {/* WCAG 1.4.3 — was text-zinc-400 (2.56:1), bumped to text-zinc-500 for 4.83:1 on white */}
            <span className="w-5 shrink-0 font-mono text-[10px] tabular-nums text-zinc-500">
              {String(i + 1).padStart(2, '0')}
            </span>
            <a
              href={`#${slug(s)}`}
              className="inline-flex min-h-[24px] items-center transition-colors hover:text-zinc-950"
            >
              {s}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function MobileTOC() {
  return (
    <details className="group mt-8 rounded-2xl border border-zinc-900/10 bg-white/60 px-5 py-4 lg:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
        <span>On this page</span>
        {/* WCAG 1.4.11 — was text-zinc-400 (2.56:1), bumped to text-zinc-500 for 4.83:1 non-text contrast */}
        <span
          aria-hidden="true"
          className="text-[12px] text-zinc-500 transition-transform group-open:rotate-180"
        >
          &#9662;
        </span>
      </summary>
      <ol className="mt-4 space-y-2">
        {SECTIONS.map((s, i) => (
          <li key={s} className="flex items-baseline gap-2 text-[13px] leading-snug text-zinc-600">
            {/* WCAG 1.4.3 — was text-zinc-400 (2.56:1), bumped to text-zinc-500 for 4.83:1 on white */}
            <span className="w-5 shrink-0 font-mono text-[10px] tabular-nums text-zinc-500">
              {String(i + 1).padStart(2, '0')}
            </span>
            <a
              href={`#${slug(s)}`}
              className="inline-flex min-h-[24px] items-center hover:text-zinc-950"
            >
              {s}
            </a>
          </li>
        ))}
      </ol>
    </details>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>;
}

function UL({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-2 pl-6">{children}</ul>;
}

function Em({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-zinc-900">{children}</span>;
}

function LegalTopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-900/5 bg-[#FAF7F1]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 text-zinc-900">
          <BrickGlyph />
          <span className="text-[15px] font-semibold tracking-tight">BrickThink</span>
        </Link>
        <Link
          href="/sign-in"
          className="text-sm text-zinc-600 transition-colors hover:text-zinc-900"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}

function LegalFooterNav() {
  return (
    <>
      <nav
        aria-label="Legal"
        className="mt-16 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-zinc-900/10 pt-6 text-[13px] text-zinc-600"
      >
        <Link href="/" className="hover:text-zinc-900">
          Home
        </Link>
        <Link href="/privacy" className="hover:text-zinc-900">
          Privacy Policy
        </Link>
        <Link href="/sign-in" className="hover:text-zinc-900">
          Sign in
        </Link>
        <a href="mailto:privacy@brickthink.io" className="hover:text-zinc-900">
          Contact
        </a>
      </nav>
      <p className="mt-4 max-w-3xl text-[12px] leading-relaxed text-zinc-500">
        LEGO®, SERIOUS PLAY®, IMAGINOPEDIA, the Minifigure and the Brick and Knob configurations are
        trademarks of the LEGO Group, which does not sponsor, authorize or endorse this product.
      </p>
    </>
  );
}

function BrickGlyph() {
  return (
    <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#a8482a] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18),0_2px_0_rgba(255,255,255,0.4)_inset]">
      <span className="absolute left-1/2 top-1.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-black/20" />
      <span className="absolute right-1/4 top-1.5 h-1.5 w-1.5 translate-x-1/2 rounded-full bg-black/20" />
    </span>
  );
}
