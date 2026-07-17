import { IsIn, IsOptional, IsString, IsUrl } from 'class-validator';

import type { RequiredCredential } from '../professionals/domain/types';

export class CreateTaskDto {
  @IsString()
  orderId!: string;

  @IsString()
  propertyId!: string;

  @IsString()
  itemCode!: string;

  @IsString()
  province!: string;
}

export class AssignDto {
  @IsString()
  professionalId!: string;
}

export class DeliverDto {
  @IsUrl()
  deliverableUrl!: string;
}

export class SetCredentialPolicyDto {
  @IsIn([
    'NONE',
    'REA_MEDIATORE',
    'ALBO_TECNICO',
    'APE_CERTIFIER',
    'PHOTOGRAPHER',
    'NOTAIO',
  ])
  requiredCredential!: RequiredCredential;
}

export class ListAssignmentsQueryDto {
  @IsOptional()
  @IsIn(['REQUESTED', 'ASSIGNED', 'IN_PROGRESS', 'DELIVERED', 'APPROVED'])
  status?: 'REQUESTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'DELIVERED' | 'APPROVED';
}
