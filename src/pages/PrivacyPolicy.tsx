import { useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye, Lock, Mail, ShieldCheck } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { cn } from '@/lib/utils';

/** Lichte contentkaarten — minder visuele massa */
const contentCardClass =
  'rounded-[20px] border border-black/[0.045] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]';

const tocCardClass =
  'rounded-[20px] border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03),0_6px_20px_rgba(15,23,42,0.035)]';

const trustCardClass =
  'rounded-[16px] border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03),0_4px_12px_rgba(15,23,42,0.04)]';

const SectionBadge = ({ n }: { n: string }) => (
  <span
    className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] bg-primary text-[11px] font-semibold tabular-nums text-primary-foreground"
    aria-hidden
  >
    {n}
  </span>
);

const Prose = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div
    className={cn(
      'space-y-4 text-[15px] leading-[1.72] text-[#45454D] [&_strong]:font-semibold [&_strong]:text-[#2C2C31]',
      className,
    )}
  >
    {children}
  </div>
);

const TocRow = ({
  index,
  label,
  targetId,
  onNavigate,
}: {
  index: string;
  label: string;
  targetId: string;
  onNavigate: (id: string) => void;
}) => (
  <button
    type="button"
    onClick={() => onNavigate(targetId)}
    className="group flex w-full items-center gap-3 rounded-[14px] py-4 pl-0.5 pr-1 text-left transition-colors active:bg-[#F8F8FA]"
  >
    <span className="w-8 shrink-0 text-[13px] font-semibold tabular-nums text-primary/90">{index}</span>
    <span className="min-w-0 flex-1 text-[15px] font-medium leading-snug tracking-[-0.01em] text-[#2C2C31]">
      {label}
    </span>
    <ChevronRight
      className="h-3.5 w-3.5 shrink-0 text-[#D8D8DC] transition-colors group-hover:text-[#B8B8BC]"
      aria-hidden
      strokeWidth={2}
    />
  </button>
);

const TocDivider = () => (
  <div className="mx-0 h-px bg-gradient-to-r from-transparent via-black/[0.032] to-transparent" />
);

/**
 * Interne privacyverklaring (productie, april 2026) — premium mobiele layout.
 */
const PrivacyPolicy = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="min-h-dvh bg-[#EFEFF2]">
      {/* Hero — dieper, rustiger gradient */}
      <header className="relative overflow-hidden rounded-b-[28px] px-5 pb-10 pt-5 text-white shadow-[0_12px_40px_rgba(45,0,0,0.12)]">
        <div
          className="absolute inset-0 bg-gradient-to-b from-[hsl(0_58%_14%)] via-[hsl(0_66%_22%)] to-[hsl(0_72%_32%)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_-30%,rgba(255,255,255,0.08),transparent_55%)]"
          aria-hidden
        />
        <div
          className="relative"
          style={{ paddingTop: 'max(0.875rem, env(safe-area-inset-top, 0px))' }}
        >
          <div className="flex items-center justify-between gap-2 pb-0.5 pt-0.5">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="-ml-1.5 mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full text-white/[0.82] transition-colors hover:bg-white/[0.07] active:bg-white/[0.11]"
              aria-label={t('common.back')}
            >
              <ChevronLeft className="h-[21px] w-[21px]" strokeWidth={1.65} aria-hidden />
            </button>
            <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] font-semibold uppercase tracking-[0.22em] text-white/30">
              Alhan Groep
            </p>
            <div className="h-9 w-9 shrink-0" aria-hidden />
          </div>

          <div className="mt-7 text-center">
            <h1 className="text-[22px] font-semibold leading-[1.2] tracking-[-0.025em] text-white">
              Privacyverklaring
            </h1>
            <p className="mx-auto mt-4 max-w-[17.5rem] text-[14px] font-normal leading-relaxed text-white/72">
              Transparantie en vertrouwen staan centraal
            </p>
            <div className="mt-7 inline-flex rounded-full border border-white/[0.12] bg-white/[0.035] px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-white/78">
              Laatst bijgewerkt: april 2026
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[430px] space-y-5 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+92px)] pt-5">
        {/* Trust indicators */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { Icon: ShieldCheck, label: 'AVG conform' },
            { Icon: Lock, label: 'Versleuteld' },
            { Icon: Eye, label: 'Transparant' },
          ].map(({ Icon, label }) => (
            <div
              key={label}
              className={cn(
                trustCardClass,
                'flex flex-col items-center justify-center gap-2 px-2 py-[14px] text-center',
              )}
            >
              <Icon className="h-[22px] w-[22px] text-primary" strokeWidth={1.6} aria-hidden />
              <span className="text-[11px] font-medium leading-tight tracking-[-0.01em] text-[#48484D]">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Table of contents */}
        <section className={cn(tocCardClass, 'px-5 pb-2 pt-6')} aria-labelledby="privacy-toc-title">
          <div className="mb-4 flex items-center gap-3">
            <SectionBadge n="01" />
            <h2
              id="privacy-toc-title"
              className="text-[16px] font-semibold tracking-[-0.02em] text-[#1C1C1E]"
            >
              Inhoudsopgave
            </h2>
          </div>
          <div className="flex flex-col">
            <TocRow
              index="01"
              label="Inleiding en verwerkingsverantwoordelijke"
              targetId="sectie-inleiding"
              onNavigate={scrollToSection}
            />
            <TocDivider />
            <TocRow
              index="02"
              label="Gegevens die wij expliciet niet verwerken"
              targetId="sectie-niet-verwerkt"
              onNavigate={scrollToSection}
            />
            <TocDivider />
            <TocRow
              index="03"
              label="Categorieën, doeleinden en grondslagen"
              targetId="sectie-categorieen"
              onNavigate={scrollToSection}
            />
            <TocDivider />
            <TocRow index="04" label="Alhan AI en besluitvorming" targetId="sectie-ai" onNavigate={scrollToSection} />
            <TocDivider />
            <TocRow
              index="05"
              label="Platform Partner Programma"
              targetId="sectie-ppp"
              onNavigate={scrollToSection}
            />
            <TocDivider />
            <TocRow index="06" label="App-machtigingen" targetId="sectie-machtigingen" onNavigate={scrollToSection} />
            <TocDivider />
            <TocRow index="07" label="Ontvangers en verwerkers" targetId="sectie-ontvangers" onNavigate={scrollToSection} />
            <TocDivider />
            <TocRow index="08" label="Internationale doorgifte" targetId="sectie-doorgifte" onNavigate={scrollToSection} />
            <TocDivider />
            <TocRow index="09" label="Bewaartermijnen" targetId="sectie-bewaartermijnen" onNavigate={scrollToSection} />
            <TocDivider />
            <TocRow index="10" label="Beveiliging" targetId="sectie-beveiliging" onNavigate={scrollToSection} />
            <TocDivider />
            <TocRow index="11" label="Uw rechten" targetId="sectie-rechten" onNavigate={scrollToSection} />
            <TocDivider />
            <TocRow index="12" label="Wijzigingen" targetId="sectie-wijzigingen" onNavigate={scrollToSection} />
            <TocDivider />
            <TocRow index="13" label="Contact" targetId="sectie-contact" onNavigate={scrollToSection} />
          </div>
        </section>

        {/* 1. Inleiding */}
        <section id="sectie-inleiding" className={cn(contentCardClass, 'scroll-mt-6 px-5 pb-6 pt-5')}>
          <div className="mb-4 flex items-start gap-3.5">
            <SectionBadge n="02" />
            <h2 className="pt-0.5 text-[16px] font-semibold leading-snug tracking-[-0.02em] text-[#1C1C1E]">
              Inleiding en verwerkingsverantwoordelijke
            </h2>
          </div>
          <Prose>
            <p>
              Alhan Groep B.V. exploiteert een platform en mobiele applicatie voor opdrachtnemers, ondernemers,
              professionals en opdrachtgevers binnen de Nederlandse infrastructuursector. Bij het aanbieden van deze
              diensten verwerken wij persoonsgegevens.
            </p>
            <p>De verwerkingsverantwoordelijke in de zin van de Algemene verordening gegevensbescherming (AVG) is:</p>
            <p>
              <strong className="text-[#2C2C31]">Alhan Groep B.V.</strong>
              <br />
              Harregatplein 24
              <br />
              3214 VP Zuidland
              <br />
              Nederland
              <br />
              E-mail:{' '}
              <a
                href="mailto:info@alhangroep.nl"
                className="font-medium text-primary underline underline-offset-[3px] decoration-primary/30"
              >
                info@alhangroep.nl
              </a>
            </p>
            <p>
              Alhan Groep B.V. heeft geen Functionaris voor Gegevensbescherming (FG) aangesteld, omdat de aard en omvang
              van de verwerkingen hiertoe op grond van artikel 37 AVG niet verplichten. Privacyvragen worden rechtstreeks
              via bovenstaand e-mailadres afgehandeld.
            </p>
          </Prose>
        </section>

        {/* 2. Niet verwerkt */}
        <section id="sectie-niet-verwerkt" className={cn(contentCardClass, 'scroll-mt-6 px-5 pb-6 pt-5')}>
          <div className="mb-4 flex items-start gap-3.5">
            <SectionBadge n="03" />
            <h2 className="pt-0.5 text-[16px] font-semibold leading-snug tracking-[-0.02em] text-[#1C1C1E]">
              Gegevens die wij expliciet niet verwerken
            </h2>
          </div>
          <Prose>
            <p>Voor de reguliere werking van de applicatie en het platform verwerken en slaan wij de volgende gegevens niet op:</p>
            <ul className="list-disc space-y-2 pl-[1.125rem] marker:text-primary/80">
              <li>Burgerservicenummer (BSN)</li>
              <li>Bankrekeningnummers (IBAN) of overige financiële betaalgegevens van gebruikers</li>
              <li>Foto’s of kopieën van volledige identiteitsbewijzen</li>
            </ul>
          </Prose>
        </section>

        {/* 3. Categorieën */}
        <section id="sectie-categorieen" className={cn(contentCardClass, 'scroll-mt-6 px-5 pb-6 pt-5')}>
          <div className="mb-4 flex items-start gap-3.5">
            <SectionBadge n="04" />
            <h2 className="pt-0.5 text-[16px] font-semibold leading-snug tracking-[-0.02em] text-[#1C1C1E]">
              Categorieën van persoonsgegevens, doeleinden en grondslagen
            </h2>
          </div>
          <Prose>
            <p>
              De verwerking van persoonsgegevens vindt plaats op basis van de volgende wettelijke grondslagen uit artikel
              6 lid 1 AVG:
            </p>
            <p className="!mt-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8E8E93]">Accountgegevens</p>
            <p>Naam, e-mailadres, inlogmethode (Apple Sign-In, Google Sign-In of e-mail), account-ID.</p>
            <p>
              <strong>Doel:</strong> Registratie, authenticatie en accountbeheer.
              <br />
              <strong>Grondslag:</strong> Uitvoering overeenkomst (art. 6.1.b AVG)
            </p>
            <p>Wij ontvangen geen wachtwoorden van Apple of Google; authenticatie verloopt via hun eigen beveiligde systemen.</p>

            <p className="!mt-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8E8E93]">Professionele gegevens</p>
            <p>
              <abbr title="Kamer van Koophandel">KvK</abbr>-nummer, bedrijfsgegevens, geüploade certificaten.
            </p>
            <p>
              <strong>Doel:</strong> Verificatie van opdrachtnemers en vaststelling van kwalificaties binnen de
              infrastructuursector.
              <br />
              <strong>Grondslag:</strong> Uitvoering overeenkomst (art. 6.1.b AVG)
            </p>

            <p className="!mt-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8E8E93]">Operationele gegevens</p>
            <p>Urenregistratie, veiligheidschecklists, beschikbaarheidsindicaties.</p>
            <p>
              <strong>Doel:</strong> Administratieve vastlegging en veiligheidsregistratie ten behoeve van de gebruiker zelf.
              <br />
              <strong>Grondslag:</strong> Uitvoering overeenkomst (art. 6.1.b AVG)
            </p>

            <p className="!mt-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8E8E93]">Programmagegevens</p>
            <p>
              Puntensaldo, behaalde tier, deelnamehistorie en gekozen beloningen binnen het Platform Partner Programma.
            </p>
            <p>
              <strong>Doel:</strong> Beheer en uitvoering van het interne Platform Partner Programma.
              <br />
              <strong>Grondslag:</strong> Uitvoering overeenkomst (art. 6.1.b AVG)
            </p>

            <p className="!mt-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8E8E93]">Referralgegevens</p>
            <p>Verstrekte en ontvangen referral-codes, gekoppelde accounts.</p>
            <p>
              <strong>Doel:</strong> Administratie van het referralsysteem.
              <br />
              <strong>Grondslag:</strong> Uitvoering overeenkomst (art. 6.1.b AVG)
            </p>

            <p className="!mt-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8E8E93]">
              AI-interactiedata (Alhan AI)
            </p>
            <p>Door de gebruiker verstrekte profielinformatie en hulpvragen.</p>
            <p>
              <strong>Doel:</strong> Genereren van ondersteunende, gepersonaliseerde adviezen.
              <br />
              <strong>Grondslag:</strong> Toestemming (art. 6.1.a AVG)
            </p>

            <p className="!mt-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8E8E93]">Technische gegevens</p>
            <p>Apparaatinformatie, app-logs, crashrapporten, push-tokens.</p>
            <p>
              <strong>Doel:</strong> Systeembeveiliging, foutopsporing en aflevering van meldingen.
              <br />
              <strong>Grondslag:</strong> Gerechtvaardigd belang (art. 6.1.f AVG)
            </p>
            <p>
              Voor verwerkingen op basis van gerechtvaardigd belang heeft Alhan Groep B.V. een belangenafweging opgesteld,
              die op verzoek kan worden ingezien.
            </p>
          </Prose>
        </section>

        {/* 4. Alhan AI */}
        <section id="sectie-ai" className={cn(contentCardClass, 'scroll-mt-6 px-5 pb-6 pt-5')}>
          <div className="mb-4 flex items-start gap-3.5">
            <SectionBadge n="05" />
            <h2 className="pt-0.5 text-[16px] font-semibold leading-snug tracking-[-0.02em] text-[#1C1C1E]">
              Alhan AI en besluitvorming
            </h2>
          </div>
          <Prose>
            <p>
              Het platform biedt een AI-functionaliteit onder de naam “Alhan AI” voor ondersteunende doeleinden, zoals
              profielcoaching en dashboard-suggesties. Deze functionaliteit is uitsluitend adviserend.
            </p>
            <p>
              Er vindt geen geautomatiseerde besluitvorming plaats in de zin van artikel 22 AVG die rechtsgevolgen heeft
              of de gebruiker in aanmerkelijke mate treft. Verificatiebeslissingen, toelating tot het platform en deelname
              aan het Platform Partner Programma worden niet door de AI bepaald. Menselijke tussenkomst is gewaarborgd
              bij alle beoordelingsprocessen.
            </p>
            <p>
              Gebruik van Alhan AI is optioneel. De gebruiker geeft actief toestemming voor het delen van
              profielinformatie en vragen met deze functionaliteit en kan deze toestemming op elk moment intrekken via de
              app-instellingen.
            </p>
          </Prose>
        </section>

        {/* 5. Platform Partner Programma */}
        <section id="sectie-ppp" className={cn(contentCardClass, 'scroll-mt-6 px-5 pb-6 pt-5')}>
          <div className="mb-4 flex items-start gap-3.5">
            <SectionBadge n="06" />
            <h2 className="pt-0.5 text-[16px] font-semibold leading-snug tracking-[-0.02em] text-[#1C1C1E]">
              Platform Partner Programma
            </h2>
          </div>
          <Prose>
            <p>
              Alhan Groep B.V. biedt een intern incentiveprogramma aan, het <strong>Platform Partner Programma</strong>,
              uitsluitend toegankelijk voor geverifieerde opdrachtnemers die via Alhan Groep B.V. werken. Deelname is
              volledig vrijwillig en staat los van de opdrachtverstrekking; niet-deelname heeft geen gevolgen voor de
              samenwerking.
            </p>
            <p>
              Binnen het programma worden punten toegekend voor objectieve, zakelijk relevante activiteiten zoals
              urenregistratie, veiligheidschecks, certificeringen, afgeronde opdrachten en referrals.
            </p>
            <p>
              Wanneer een deelnemer een vooraf vastgestelde maandelijkse drempel behaalt, ontstaat op basis van het
              behaalde puntenbereik recht op een keuzebeloning uit een door Alhan Groep B.V. beheerde catalogus.
              Beloningen worden door Alhan Groep B.V. zelf ingekocht en verstrekt.
            </p>
            <p>
              De toewijzing van beloningen geschiedt op basis van vooraf kenbare drempels en tiers, zonder loting of
              kansbepaling. De volledige programmavoorwaarden zijn beschikbaar binnen de app.
            </p>
            <p>
              De waarde van ontvangen beloningen kan voor de opdrachtnemer fiscaal relevant zijn. Alhan Groep B.V.
              verstrekt jaarlijks een overzicht van uitgekeerde beloningen ten behoeve van de eigen administratie van de
              opdrachtnemer.
            </p>
          </Prose>
        </section>

        {/* 6. Machtigingen */}
        <section id="sectie-machtigingen" className={cn(contentCardClass, 'scroll-mt-6 px-5 pb-6 pt-5')}>
          <div className="mb-4 flex items-start gap-3.5">
            <SectionBadge n="07" />
            <h2 className="pt-0.5 text-[16px] font-semibold leading-snug tracking-[-0.02em] text-[#1C1C1E]">
              App-machtigingen
            </h2>
          </div>
          <Prose>
            <p>De applicatie verzoekt om de volgende toestemmingen:</p>
            <ul className="list-disc space-y-2 pl-[1.125rem] marker:text-primary/80">
              <li>
                <strong>Camera en fotobibliotheek:</strong> voor het uploaden van een profielfoto en relevante certificaten
              </li>
              <li>
                <strong>Pushnotificaties:</strong> voor meldingen over accountstatus, verificatie en platformactiviteit
              </li>
            </ul>
            <p>
              Deze machtigingen kunnen op elk moment via de besturingssysteeminstellingen van het apparaat worden beheerd.
            </p>
          </Prose>
        </section>

        {/* 7. Ontvangers */}
        <section id="sectie-ontvangers" className={cn(contentCardClass, 'scroll-mt-6 px-5 pb-6 pt-5')}>
          <div className="mb-4 flex items-start gap-3.5">
            <SectionBadge n="08" />
            <h2 className="pt-0.5 text-[16px] font-semibold leading-snug tracking-[-0.02em] text-[#1C1C1E]">
              Ontvangers en verwerkers
            </h2>
          </div>
          <Prose>
            <p>
              Wij schakelen externe dienstverleners in als verwerker in de zin van artikel 28 AVG, waarmee
              verwerkersovereenkomsten zijn gesloten:
            </p>
            <ul className="list-disc space-y-2 pl-[1.125rem] marker:text-primary/80">
              <li>
                <strong>Infrastructuur:</strong> Supabase (database, opslag en authenticatie)
              </li>
              <li>
                <strong>AI-functionaliteit:</strong> AI-dienstverleners voor de verwerking van prompts binnen Alhan AI
              </li>
              <li>
                <strong>Systeemmeldingen:</strong> Apple (APNs) en Google (FCM) voor pushnotificaties
              </li>
              <li>
                <strong>Foutrapportage:</strong> dienstverleners voor crash- en foutanalyse (zoals Sentry)
              </li>
            </ul>
            <p>Persoonsgegevens worden niet verkocht en niet voor commerciële doeleinden aan derden verstrekt.</p>
          </Prose>
        </section>

        {/* 8. Doorgifte */}
        <section id="sectie-doorgifte" className={cn(contentCardClass, 'scroll-mt-6 px-5 pb-6 pt-5')}>
          <div className="mb-4 flex items-start gap-3.5">
            <SectionBadge n="09" />
            <h2 className="pt-0.5 text-[16px] font-semibold leading-snug tracking-[-0.02em] text-[#1C1C1E]">
              Internationale doorgifte
            </h2>
          </div>
          <Prose>
            <p>
              Persoonsgegevens worden primair gehost binnen de Europese Economische Ruimte (EER). Voor diensten geleverd
              door buiten de EER gevestigde verwerkers vindt doorgifte uitsluitend plaats op basis van door de Europese
              Commissie goedgekeurde Standard Contractual Clauses (SCC’s), aangevuld met passende technische en
              organisatorische beveiligingsmaatregelen om een met de EER vergelijkbaar beschermingsniveau te waarborgen.
            </p>
          </Prose>
        </section>

        {/* 9. Bewaartermijnen */}
        <section id="sectie-bewaartermijnen" className={cn(contentCardClass, 'scroll-mt-6 px-5 pb-6 pt-5')}>
          <div className="mb-4 flex items-start gap-3.5">
            <SectionBadge n="10" />
            <h2 className="pt-0.5 text-[16px] font-semibold leading-snug tracking-[-0.02em] text-[#1C1C1E]">
              Bewaartermijnen
            </h2>
          </div>
          <Prose>
            <p>Persoonsgegevens worden niet langer bewaard dan noodzakelijk:</p>
            <ul className="list-disc space-y-2 pl-[1.125rem] marker:text-primary/80">
              <li>
                <strong>Actieve accounts:</strong> gegevens blijven bewaard zolang het account actief is
              </li>
              <li>
                <strong>Verwijderde accounts:</strong> na een verwijderingsverzoek via de app worden gegevens binnen 30
                dagen permanent verwijderd of onomkeerbaar geanonimiseerd
              </li>
              <li>
                <strong>Technische logs:</strong> worden na 6 maanden automatisch verwijderd
              </li>
              <li>
                <strong>Programmagegevens:</strong> historie van deelname en uitkeringen wordt bewaard zolang het account
                actief is, en daarna conform de fiscale bewaarplicht
              </li>
              <li>
                <strong>Fiscale bewaarplicht:</strong> administratieve gegevens waarop een bewaarplicht rust, worden 7 jaar
                bewaard op grond van artikel 52 van de Algemene wet inzake rijksbelastingen (AWR)
              </li>
            </ul>
          </Prose>
        </section>

        {/* 10. Beveiliging */}
        <section id="sectie-beveiliging" className={cn(contentCardClass, 'scroll-mt-6 px-5 pb-6 pt-5')}>
          <div className="mb-4 flex items-start gap-3.5">
            <SectionBadge n="11" />
            <h2 className="pt-0.5 text-[16px] font-semibold leading-snug tracking-[-0.02em] text-[#1C1C1E]">
              Beveiliging
            </h2>
          </div>
          <Prose>
            <p>
              Alhan Groep B.V. neemt passende technische en organisatorische maatregelen om persoonsgegevens te beveiligen,
              waaronder versleuteling van gegevens tijdens transport (HTTPS/TLS) en in rust, alsmede toegangsbeheer via
              Role-Based Access Control (RBAC) voor geautoriseerd personeel.
            </p>
          </Prose>
        </section>

        {/* 11. Rechten */}
        <section id="sectie-rechten" className={cn(contentCardClass, 'scroll-mt-6 px-5 pb-6 pt-5')}>
          <div className="mb-4 flex items-start gap-3.5">
            <SectionBadge n="12" />
            <h2 className="pt-0.5 text-[16px] font-semibold leading-snug tracking-[-0.02em] text-[#1C1C1E]">
              Uw rechten
            </h2>
          </div>
          <Prose>
            <p>Als betrokkene heeft u op grond van de AVG de volgende rechten:</p>
            <ul className="list-disc space-y-2 pl-[1.125rem] marker:text-primary/80">
              <li>Recht op inzage in de over u verwerkte persoonsgegevens</li>
              <li>Recht op rectificatie van onjuiste of onvolledige gegevens</li>
              <li>
                Recht op verwijdering (recht op vergetelheid), direct uitvoerbaar via de functie “Account verwijderen” in
                de app
              </li>
              <li>Recht op beperking van de verwerking</li>
              <li>Recht op dataportabiliteit: een digitaal exportbestand van uw gegevens</li>
              <li>Recht van bezwaar tegen verwerkingen op basis van gerechtvaardigd belang</li>
              <li>
                Recht op intrekking van toestemming voor verwerkingen die op toestemming zijn gebaseerd, zoals het gebruik
                van Alhan AI
              </li>
            </ul>
            <p>
              <strong>Reactietermijn:</strong> wij reageren binnen één maand na ontvangst op uw verzoek, conform artikel 12
              lid 3 AVG. Bij complexe verzoeken kan deze termijn met twee maanden worden verlengd; u wordt hierover tijdig
              geïnformeerd.
            </p>
            <p>
              <strong>Identificatie:</strong> ter bescherming van uw privacy kunnen wij u vragen om u te identificeren
              voordat wij gehoor geven aan een verzoek.
            </p>
            <p>
              <strong>Klachtrecht:</strong> u heeft het recht een klacht in te dienen bij de Autoriteit Persoonsgegevens
              via{' '}
              <a
                href="https://www.autoriteitpersoonsgegevens.nl"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-[3px] decoration-primary/30"
              >
                autoriteitpersoonsgegevens.nl
              </a>
              .
            </p>
          </Prose>
        </section>

        {/* 12. Wijzigingen */}
        <section id="sectie-wijzigingen" className={cn(contentCardClass, 'scroll-mt-6 px-5 pb-6 pt-5')}>
          <div className="mb-4 flex items-start gap-3.5">
            <SectionBadge n="13" />
            <h2 className="pt-0.5 text-[16px] font-semibold leading-snug tracking-[-0.02em] text-[#1C1C1E]">
              Wijzigingen
            </h2>
          </div>
          <Prose>
            <p>
              Alhan Groep B.V. kan deze privacyverklaring aanpassen naar aanleiding van wetswijzigingen of platformupdates.
              Bij belangrijke wijzigingen worden gebruikers geïnformeerd via e-mail of een in-app-melding.
            </p>
          </Prose>
        </section>

        {/* 13. Contact */}
        <section
          id="sectie-contact"
          className={cn(
            contentCardClass,
            'scroll-mt-6 overflow-hidden border-black/[0.05] bg-gradient-to-b from-[#FAFAFA] to-white p-0 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_rgba(15,23,42,0.05)]',
          )}
        >
          <div className="border-b border-black/[0.05] px-5 pb-5 pt-5">
            <div className="flex items-center gap-3.5">
              <SectionBadge n="14" />
              <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[#1C1C1E]">Contact</h2>
            </div>
            <p className="mt-3 pl-11 text-[13px] leading-relaxed text-[#6B6B70]">
              Voor privacyvragen of het uitoefenen van uw rechten kunt u contact opnemen via:
            </p>
          </div>
          <div className="space-y-3 px-5 py-5">
            <div className="flex gap-3 rounded-[14px] border border-black/[0.05] bg-white/80 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/[0.08]">
                <Mail className="h-[18px] w-[18px] text-primary" strokeWidth={1.75} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9B9BA0]">E-mail</p>
                <a
                  href="mailto:info@alhangroep.nl"
                  className="mt-1 block text-[15px] font-semibold text-primary underline-offset-2 hover:underline"
                >
                  info@alhangroep.nl
                </a>
              </div>
            </div>
            <p className="pt-1 text-center text-[11px] leading-relaxed text-[#A1A1A6]">
              © Alhan Groep B.V. — Privacyverklaring — april 2026
            </p>
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
};

export default PrivacyPolicy;
