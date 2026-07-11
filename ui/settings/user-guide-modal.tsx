/**
 * User Guide — a full-screen glass modal, opened from Settings, walking a
 * brand-new user through what UNCT is, the offline/no-backend guarantee,
 * a suggested first-3-steps path, all 8 screens (each with a real
 * screenshot — never a mockup, per the task's own requirement), and the
 * project's actual Known Limitations. Content lives entirely in
 * `core/i18n/dictionaries/{en,fa}.js` under the `userGuide.*` key namespace
 * (see `guide-content.ts` for the per-screen key/screenshot list);
 * `t()`'s flat key -> string lookup has no interpolation support
 * (`core/i18n/translator.js`), so every string here is its own key, not
 * built from a template.
 *
 * This is the first true modal dialog in the app — the only prior overlay
 * precedent (`ui/components/nav.tsx`'s mobile "More" sheet) has no focus
 * trap, no Escape handling, and no `role="dialog"`, so those gaps are not
 * copied here: this component owns a minimal focus trap, an Escape-key
 * close, `role="dialog"`/`aria-modal`, and restores focus to whatever
 * triggered it on close (a11y-pass). The entrance transition is guarded by
 * `prefers-reduced-motion` entirely in CSS (`.guide-modal`'s own rule in
 * `assets/css/theme.css`) — no JS media-query branching needed.
 *
 * Deliberately local to Settings (`open`/`onClose` state lives in
 * `settings-screen.tsx`, not lifted into `main.tsx`/`Screen`): the Guide is
 * reachable from exactly one place, so there's no reason to widen its state
 * beyond the one screen that renders it (Rule: don't design for hypothetical
 * future entry points).
 */
import { useEffect, useRef } from "preact/hooks";
import { createTranslator } from "../../core/i18n/translator.js";
import { settingsStore, useSettingsState } from "../store/use-settings-state.js";
import { GUIDE_SCREENS, guideScreenshotSrc } from "./guide-content.js";

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function UserGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { resolvedLanguage } = useSettingsState();
  const t = createTranslator(settingsStore);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const language = resolvedLanguage === "fa" ? "fa" : "en";

  return (
    <>
      <button type="button" class="guide-modal-backdrop" aria-label={t("userGuide.closeLabel")} onClick={onClose} />
      <div class="guide-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="guide-modal-title" ref={dialogRef}>
        <div class="guide-modal__header">
          <h2 id="guide-modal-title" class="guide-modal__title">{t("userGuide.title")}</h2>
          <button type="button" class="guide-modal__close" onClick={onClose} ref={closeButtonRef} aria-label={t("userGuide.closeLabel")}>
            &#10005;
          </button>
        </div>

        <nav class="guide-toc" aria-label={t("userGuide.title")}>
          <a class="guide-toc__link" href="#guide-section-intro">{t("userGuide.toc.intro")}</a>
          <a class="guide-toc__link" href="#guide-section-first-steps">{t("userGuide.toc.firstSteps")}</a>
          <a class="guide-toc__link" href="#guide-section-screens">{t("userGuide.toc.screens")}</a>
          <a class="guide-toc__link" href="#guide-section-limitations">{t("userGuide.toc.limitations")}</a>
        </nav>

        <div class="guide-modal__body">
          <section class="guide-section" id="guide-section-intro">
            <h3 class="guide-section__title">{t("userGuide.intro.title")}</h3>
            <p class="guide-section__text">{t("userGuide.intro.body1")}</p>
            <div class="guide-callout">
              <div class="guide-callout__title">{t("userGuide.intro.offlineTitle")}</div>
              <p class="guide-callout__text">{t("userGuide.intro.offlineBody")}</p>
            </div>
          </section>

          <section class="guide-section" id="guide-section-first-steps">
            <h3 class="guide-section__title">{t("userGuide.firstSteps.title")}</h3>
            <ol class="guide-steps">
              <li class="guide-step">
                <div class="guide-step__title">{t("userGuide.firstSteps.step1.title")}</div>
                <p class="guide-step__desc">{t("userGuide.firstSteps.step1.desc")}</p>
              </li>
              <li class="guide-step">
                <div class="guide-step__title">{t("userGuide.firstSteps.step2.title")}</div>
                <p class="guide-step__desc">{t("userGuide.firstSteps.step2.desc")}</p>
              </li>
              <li class="guide-step">
                <div class="guide-step__title">{t("userGuide.firstSteps.step3.title")}</div>
                <p class="guide-step__desc">{t("userGuide.firstSteps.step3.desc")}</p>
              </li>
            </ol>
          </section>

          <section class="guide-section" id="guide-section-screens">
            <h3 class="guide-section__title">{t("userGuide.screens.title")}</h3>
            <div class="panel-grid guide-screens">
              {GUIDE_SCREENS.map((screen) => (
                <div class="panel glass-panel guide-screen-card" key={screen.key}>
                  <img
                    class="guide-screen-card__shot"
                    src={guideScreenshotSrc(language, screen.screenshot)}
                    alt={t(screen.titleKey)}
                  />
                  <div class="guide-screen-card__title">{t(screen.titleKey)}</div>
                  <p class="guide-screen-card__desc">{t(screen.descKey)}</p>
                  <p class="guide-screen-card__when">{t(screen.whenKey)}</p>
                </div>
              ))}
            </div>
          </section>

          <section class="guide-section" id="guide-section-limitations">
            <h3 class="guide-section__title">{t("userGuide.limitations.title")}</h3>
            <p class="guide-section__text">{t("userGuide.limitations.intro")}</p>
            <ul class="guide-limitations">
              <li>{t("userGuide.limitations.capacity")}</li>
              <li>{t("userGuide.limitations.formats")}</li>
              <li>{t("userGuide.limitations.visualization")}</li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
