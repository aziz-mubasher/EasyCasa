import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  initialFlowState,
  initialPublish,
  parseFlow,
  publishBlocker,
  publishReady,
  signInAccount,
  signOutAccount,
} from './machine.ts';
import { FRAME_LINKS, FRAME_ROUTES } from './paths.ts';

describe('login and logout', () => {
  it('opens a device session and logout returns a guest', () => {
    const signedIn = signInAccount(initialFlowState(), 'device', { name: 'Account' });
    assert.equal(signedIn.account.kind, 'member');
    if (signedIn.account.kind !== 'member') return;
    assert.equal(signedIn.account.source, 'device');

    const signedOut = signOutAccount(signedIn);
    assert.equal(signedOut.account.kind, 'guest');
    assert.equal(signedOut.returnTo, null);
    assert.equal(signedOut.publish, signedIn.publish);
  });

  it('round-trips a member snapshot', () => {
    const saved = signInAccount(initialFlowState(), 'oidc', {
      email: 'laura@example.com',
      name: 'Laura',
    });
    const restored = parseFlow(JSON.stringify(saved));
    assert.deepEqual(restored.account, saved.account);
  });
});

describe('publish process', () => {
  it('stays blocked until energy, index and terms are present', () => {
    const draft = initialPublish();
    draft.title = 'Trilocale con terrazzo';
    assert.equal(publishReady(draft), false);
    draft.energyClass = 'D';
    draft.energyIndex = '142';
    assert.equal(publishReady(draft), false);
    assert.equal(publishBlocker(draft), 'Accetta i termini per pubblicare');
    draft.terms = true;
    assert.equal(publishReady(draft), true);
    assert.equal(publishBlocker(draft), null);
  });
});

describe('design frame graph', () => {
  it('gives every linked frame a route', () => {
    const frames = new Set(Object.keys(FRAME_ROUTES));
    for (const [from, targets] of Object.entries(FRAME_LINKS)) {
      assert.equal(frames.has(from), true, from);
      for (const target of targets) {
        assert.equal(frames.has(target), true, `${from} → ${target}`);
        assert.ok(FRAME_ROUTES[target], target);
      }
    }
    assert.equal(Object.keys(FRAME_ROUTES).length >= 35, true);
  });
});
