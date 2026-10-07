import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { presentedEnquiryStatus, presentedIntentKey, seekerIntent } from './present.ts';

describe('enquiry presentation', () => {
  it('collapses merit and conversion statuses into closed', () => {
    assert.equal(presentedEnquiryStatus('NEW'), 'NEW');
    assert.equal(presentedEnquiryStatus('CONTACTED'), 'CONTACTED');
    assert.equal(presentedEnquiryStatus('CLOSED'), 'CLOSED');
    assert.equal(presentedEnquiryStatus('QUALIFIED'), 'CLOSED');
    assert.equal(presentedEnquiryStatus('CONVERTED'), 'CLOSED');
  });

  it('sends only a question or a viewing', () => {
    assert.equal(seekerIntent('info'), 'info');
    assert.equal(seekerIntent('viewing'), 'viewing');
    assert.equal(seekerIntent('anything-else'), 'viewing');
    assert.equal(presentedIntentKey('info'), 'info');
    assert.equal(presentedIntentKey('viewing'), 'viewing');
    assert.equal(presentedIntentKey('anything-else'), 'other');
  });
});
