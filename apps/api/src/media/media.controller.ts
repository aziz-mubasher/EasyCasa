import { Body, Controller, Post } from '@nestjs/common';
import { MediaService } from './media.service';
import { PresignDto, ConfirmMediaDto } from './dto/presign.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('media')
@Roles('seller', 'agent', 'partner', 'pro_marketer')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('presign')
  presign(@Body() dto: PresignDto) {
    return this.media.presign(dto.listingId, dto.contentType);
  }

  @Post('confirm')
  confirm(@Body() dto: ConfirmMediaDto) {
    return this.media.confirm(dto.listingId, dto.key, dto.alt);
  }
}
