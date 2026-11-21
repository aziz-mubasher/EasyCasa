import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Put,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { EASY_CASA_VOICE_E164, randomId } from './ids';

import { Public } from '../auth/public.decorator';
import type { ApiConfig } from '../config';
import { InjectConfig } from '../config/inject-config.decorator';
import { CallbacksService } from './callbacks.service';
import { readDeskGrant, type DeskGrant } from './callbacks.desk-grant';
import type { StoredProfile, StoredRoute } from './callbacks.types';

@Controller('desk/voice-callbacks')
@Public()
export class CallbacksDeskController {
  constructor(
    private readonly callbacks: CallbacksService,
    @InjectConfig() private readonly config: ApiConfig,
  ) {}

  private grant(header?: string): DeskGrant {
    const token = String(header || '').startsWith('Bearer ') ? header!.slice(7).trim() : '';
    const grant = readDeskGrant(token, this.config.DESK_TO_EASYCASA_SECRET);
    if (!grant || grant.role === 'none') throw new UnauthorizedException('desk-auth');
    return grant;
  }

  private admin(header?: string): DeskGrant {
    const grant = this.grant(header);
    if (grant.role !== 'admin') throw new ForbiddenException('no-access');
    return grant;
  }

  @Get()
  async list(@Headers('authorization') header?: string) {
    this.grant(header);
    const data = await this.callbacks.inbox({});
    return { ok: true, callbacks: data.items };
  }

  @Get('routing')
  async routing(@Headers('authorization') header?: string) {
    this.admin(header);
    const data = await this.callbacks.routing(EASY_CASA_VOICE_E164);
    return {
      ok: true,
      routes: (data.routes || []).map((route) => ({
        id: route.id,
        language: route.language,
        line: route.line,
        forwardProfileId: route.forwardProfileId,
        backupProfileId: route.backupProfileId,
        confirmWithin: route.confirmWithin,
        alertWhatsapp: route.alertWhatsapp,
        alertEmail: route.alertEmail,
        offerRealSlots: false,
      })),
      profiles: (data.people || []).map((person) => ({ id: person.id, name: person.name, kind: person.kind })),
    };
  }

  @Put('routing')
  async saveRouting(
    @Headers('authorization') header: string | undefined,
    @Body() body: { routes?: StoredRoute[] },
  ) {
    this.admin(header);
    const routes = (body.routes ?? []).map((route) => ({
      ...route,
      id: route.id || randomId(),
      calledNumber: EASY_CASA_VOICE_E164,
      offerRealSlots: false,
    }));
    const saved = await this.callbacks.saveRouting(EASY_CASA_VOICE_E164, routes);
    return { ok: true, routes: saved.map((route) => ({ ...route, offerRealSlots: false })) };
  }

  @Get('team')
  async team(@Headers('authorization') header?: string) {
    this.admin(header);
    const data = await this.callbacks.team();
    return { ok: true, profiles: data.profiles.map(publicProfile) };
  }

  @Put('team')
  async saveTeam(
    @Headers('authorization') header: string | undefined,
    @Body() body: Partial<StoredProfile> & { id?: string },
  ) {
    this.admin(header);
    const current = await this.callbacks.team();
    const existing = current.profiles.find((profile) => profile.id === body.id);
    if (!existing) throw new ForbiddenException('unknown-profile');
    const saved = await this.callbacks.saveProfile({
      ...existing,
      weekly: Array.isArray(body.weekly) ? body.weekly : existing.weekly,
      timeOff: Array.isArray(body.timeOff) ? body.timeOff : existing.timeOff,
      callbackMin: Number(body.callbackMin || existing.callbackMin),
      gapMin: Number(body.gapMin ?? existing.gapMin),
    });
    return { ok: true, profile: publicProfile(saved) };
  }

  @Get('availability')
  async availability(@Headers('authorization') header?: string, @Query('profile') profileId?: string) {
    const grant = this.grant(header);
    const data = await this.callbacks.team();
    const own = data.profiles.find((profile) => profile.id === grant.id || profile.adminUserId === grant.id);
    const wanted = grant.role === 'admin' && profileId
      ? data.profiles.find((profile) => profile.id === profileId)
      : own;
    if (!wanted || wanted.kind === 'team_queue') throw new ForbiddenException('no-access');
    if (grant.role !== 'admin' && wanted.id !== own?.id) throw new ForbiddenException('no-access');
    return {
      ok: true,
      profile: publicProfile(wanted),
      people: grant.role === 'admin'
        ? data.profiles.filter((profile) => profile.kind !== 'team_queue').map((profile) => ({ id: profile.id, name: profile.name }))
        : [],
    };
  }

  @Put('availability')
  async saveAvailability(
    @Headers('authorization') header: string | undefined,
    @Body() body: Partial<StoredProfile> & { id?: string },
  ) {
    const grant = this.grant(header);
    const data = await this.callbacks.team();
    const own = data.profiles.find((profile) => profile.id === grant.id || profile.adminUserId === grant.id);
    const wanted = grant.role === 'admin' && body.id
      ? data.profiles.find((profile) => profile.id === body.id)
      : own;
    if (!wanted || wanted.kind === 'team_queue') throw new ForbiddenException('no-access');
    if (grant.role !== 'admin' && wanted.id !== own?.id) throw new ForbiddenException('no-access');
    const saved = await this.callbacks.saveProfile({
      ...wanted,
      weekly: Array.isArray(body.weekly) ? body.weekly : wanted.weekly,
      timeOff: Array.isArray(body.timeOff) ? body.timeOff : wanted.timeOff,
      callbackMin: Number(body.callbackMin || wanted.callbackMin),
      gapMin: Number(body.gapMin ?? wanted.gapMin),
    });
    return { ok: true, profile: publicProfile(saved) };
  }

  @Get('calls')
  async calls(@Headers('authorization') header?: string) {
    this.grant(header);
    const page = await this.callbacks.calls(1);
    return {
      ok: true,
      rows: page.items.map((item) => ({
        id: item.id,
        startedAt: item.at,
        language: item.language,
        durationSeconds: item.durationSecs,
        outcome: item.outcome,
        recordingStatus: 'none',
        kind: 'ai',
      })),
    };
  }
}

function publicProfile(profile: StoredProfile) {
  return {
    id: profile.id,
    name: profile.name,
    kind: profile.kind,
    languages: profile.languages,
    callbackMin: profile.callbackMin,
    gapMin: profile.gapMin,
    weekly: profile.weekly,
    timeOff: profile.timeOff,
  };
}
