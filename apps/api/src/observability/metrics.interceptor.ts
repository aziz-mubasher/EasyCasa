import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { httpRequestDuration, httpRequestsTotal } from './metrics';

/**
 * Records duration + count for every HTTP request. Uses the matched route
 * pattern (not the raw URL) as the label so cardinality stays bounded — a raw
 * URL with ids would explode the metric space.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<{ method: string; route?: { path?: string }; url: string }>();
    const res = http.getResponse<{ statusCode: number }>();
    const end = httpRequestDuration.startTimer();
    const method = req.method;

    const finalize = () => {
      const route = req.route?.path ?? 'unmatched';
      const status = String(res.statusCode);
      end({ method, route, status });
      httpRequestsTotal.inc({ method, route, status });
    };

    return next.handle().pipe(tap({ next: finalize, error: finalize }));
  }
}
