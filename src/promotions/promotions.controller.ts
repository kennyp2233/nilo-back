// src/promotions/promotions.controller.ts
import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';
import { ApplyPromoCodeDto } from './dto/update-promo-code.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@Controller('promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PromotionsController {
    constructor(private readonly promotionsService: PromotionsService) { }

    @Post()
    @Roles(UserRole.ADMIN)
    create(@Body() createPromoCodeDto: CreatePromoCodeDto) {
        return this.promotionsService.create(createPromoCodeDto);
    }

    @Get()
    @Roles(UserRole.ADMIN)
    findAll() {
        return this.promotionsService.findAll();
    }

    @Get(':id')
    @Roles(UserRole.ADMIN)
    findOne(@Param('id') id: string) {
        return this.promotionsService.findOne(id);
    }

    @Get('code/:code')
    @Public()
    findByCode(@Param('code') code: string) {
        return this.promotionsService.findByCode(code);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    update(@Param('id') id: string, @Body() updatePromoCodeDto: UpdatePromoCodeDto) {
        return this.promotionsService.update(id, updatePromoCodeDto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    remove(@Param('id') id: string) {
        return this.promotionsService.remove(id);
    }

    @Post('apply')
    applyPromoCode(@Body() applyPromoCodeDto: ApplyPromoCodeDto) {
        const { code, amount, tripType } = applyPromoCodeDto;
        return this.promotionsService.applyPromoCode(code, amount, tripType);
    }
}