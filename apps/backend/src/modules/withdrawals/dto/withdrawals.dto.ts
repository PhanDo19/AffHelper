import { IsDecimal, IsString, MinLength, IsOptional } from 'class-validator';

export class CreateWithdrawalDto {
    amount: number;

    @IsString()
    @MinLength(5)
    bankAccount: string;

    @IsString()
    @MinLength(2)
    bankName: string;

    @IsString()
    @MinLength(2)
    accountHolder: string;
}

export class WalletStatsDto {
    availableBalance: number;
    pendingBalance: number;
    totalWithdrawn: number;
    totalCashbackEarned: number;
}

export class WithdrawalQueryDto {
    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    limit?: string;
}
