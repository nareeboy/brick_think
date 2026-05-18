import { expect, test } from './fixtures';

test.describe('stage controller realtime propagation', () => {
  test('facilitator Start → second tab session page reflects active state', async ({
    signedInPage: page,
    seededSession,
  }) => {
    // Tab A: open the session page.
    await page.goto(`/app/sessions/${seededSession.sessionId}`);

    // Tab B: same user, same cookie jar.
    const pageB = await page.context().newPage();
    await pageB.goto(`/app/sessions/${seededSession.sessionId}`);

    // Both tabs should show a "Start" button for stage 1 (skill_building, position 0).
    // The Stage controller section is above SessionStageList.
    const startA = page.getByRole('button', { name: /^start$/i }).first();
    const startB = pageB.getByRole('button', { name: /^start$/i }).first();
    await expect(startA).toBeVisible();
    await expect(startB).toBeVisible();

    // Tab A clicks Start.
    await startA.click();

    // Tab A's button should transition from Start to Pause + Extend + Advance.
    await expect(page.getByRole('button', { name: /^pause$/i }).first()).toBeVisible({
      timeout: 5000,
    });

    // Tab B should reflect the same within 3 s via postgres_changes.
    await expect(pageB.getByRole('button', { name: /^pause$/i }).first()).toBeVisible({
      timeout: 3000,
    });

    // Tab A clicks Pause.
    await page.getByRole('button', { name: /^pause$/i }).first().click();

    // Tab B should now show Resume.
    await expect(pageB.getByRole('button', { name: /^resume$/i }).first()).toBeVisible({
      timeout: 3000,
    });

    // Tab A clicks Resume, then Advance.
    await page.getByRole('button', { name: /^resume$/i }).first().click();
    await expect(page.getByRole('button', { name: /^pause$/i }).first()).toBeVisible({
      timeout: 3000,
    });
    await page.getByRole('button', { name: /^advance$/i }).first().click();

    // Tab B: previously-active stage now completed (Rollback button visible),
    // and the next stage shows Start.
    await expect(pageB.getByRole('button', { name: /^rollback/i })).toBeVisible({
      timeout: 3000,
    });
    // The completed stage shows Rollback; the remaining pending stages show Start.
    await expect(pageB.getByRole('button', { name: /^start$/i }).first()).toBeVisible();
  });

  test('design page Builder shows timer chip when stage starts', async ({
    signedInPage: page,
    seededSession,
  }) => {
    // Tab A: open session page, create a model in stage 1 (skill_building).
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await page
      .getByTestId('stage-card-skill_building')
      .getByTestId('start-model-skill_building')
      .click();
    await page.waitForURL(/\/app\/designs\/[0-9a-f-]+/);
    const designUrl = page.url();

    // Tab B: same design URL — the Builder renders with sessionContext,
    // so StageTimerContainer is mounted in the sidebar.
    const pageB = await page.context().newPage();
    await pageB.goto(designUrl);
    await expect(pageB.getByTestId('builder-canvas')).toBeVisible();

    // Tab A: go back to the session page and click Start on stage 1.
    await page.goto(`/app/sessions/${seededSession.sessionId}`);
    await page.getByRole('button', { name: /^start$/i }).first().click();

    // Tab A should show Pause (confirms the action landed).
    await expect(page.getByRole('button', { name: /^pause$/i }).first()).toBeVisible({
      timeout: 5000,
    });

    // Tab B: the StageTimerContainer subscribes to postgres_changes on the
    // same sessionId. Once the stage flips to "active", StageTimer renders
    // with status "active" and displays the text "live".
    // role="status" + text "live" is emitted by StageTimer when status === 'active'.
    const timerChip = pageB.getByRole('status').filter({ hasText: /live/i });
    await expect(timerChip).toBeVisible({ timeout: 5000 });
  });
});
