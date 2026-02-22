import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
    constructor(private adminService: AdminService) { }

    @Get('stats')
    async getSystemStats() {
        return this.adminService.getSystemStats();
    }

    @Get('users')
    async getUsers(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.adminService.getUsers(
            parseInt(page || '1', 10),
            parseInt(limit || '20', 10),
        );
    }

    @Get('withdrawals')
    async getWithdrawals(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('status') status?: string,
    ) {
        return this.adminService.getWithdrawals(
            parseInt(page || '1', 10),
            parseInt(limit || '20', 10),
            status,
        );
    }

    @Patch('withdrawals/:id/approve')
    async approveWithdrawal(
        @Param('id') id: string,
        @CurrentUser('id') adminId: string,
    ) {
        return this.adminService.approveWithdrawal(id, adminId);
    }

    @Patch('withdrawals/:id/reject')
    async rejectWithdrawal(
        @Param('id') id: string,
        @CurrentUser('id') adminId: string,
        @Body('reason') reason: string,
    ) {
        return this.adminService.rejectWithdrawal(id, adminId, reason || 'Không đủ điều kiện');
    }

    @Patch('users/:id/toggle-active')
    async toggleUserActive(@Param('id') id: string) {
        return this.adminService.toggleUserActive(id);
    }
}
