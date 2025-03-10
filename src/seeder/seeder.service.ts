// src/seeder/seeder.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import {
    UserRole,
    VehicleCategory,
    VerificationStatus,
    TripStatus,
    TripType,
    PaymentMethod,
    PaymentStatus,
    TransactionType,
    TransactionStatus
} from '@prisma/client';

@Injectable()
export class SeederService {
    private readonly logger = new Logger(SeederService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Ejecuta todos los seeders
     */
    async seed() {
        this.logger.log('Iniciando siembra de datos...');

        // Primero limpiar la base de datos (opcional)
        await this.cleanDatabase();

        // Crear usuarios y perfiles
        await this.seedUsers();

        // Crear vehículos
        await this.seedVehicles();

        // Crear configuraciones de tarifas
        await this.seedTariffConfigs();

        // Crear viajes
        await this.seedTrips();

        // Crear pagos
        await this.seedPayments();

        // Crear calificaciones
        await this.seedRatings();

        // Crear transacciones de monedero
        await this.seedWalletTransactions();

        // Crear códigos promocionales
        await this.seedPromoCodes();

        this.logger.log('Siembra de datos completada exitosamente');
    }

    /**
     * Limpia la base de datos (opcional, usar con precaución)
     */
    async cleanDatabase() {
        this.logger.warn('Limpiando base de datos...');

        // El orden es importante para respetar restricciones de clave foránea
        await this.prisma.notificationToken.deleteMany();
        await this.prisma.walletTransaction.deleteMany();
        await this.prisma.wallet.deleteMany();
        await this.prisma.userPaymentMethod.deleteMany();
        await this.prisma.rating.deleteMany();
        await this.prisma.payment.deleteMany();
        await this.prisma.location.deleteMany();
        await this.prisma.tripPassenger.deleteMany();
        await this.prisma.trip.deleteMany();
        await this.prisma.vehicle.deleteMany();
        await this.prisma.driverDocument.deleteMany();
        await this.prisma.promoCode.deleteMany();
        await this.prisma.tariffConfig.deleteMany();
        await this.prisma.driver.deleteMany();
        await this.prisma.passenger.deleteMany();
        await this.prisma.user.deleteMany();

        this.logger.log('Base de datos limpiada');
    }

    /**
     * Crea usuarios de prueba (pasajeros, conductores y admin)
     */
    async seedUsers() {
        this.logger.log('Creando usuarios...');

        // Hash de contraseña predeterminada (password: 'password')
        const passwordHash = await bcrypt.hash('password', 10);

        // Crear usuarios pasajeros
        const passengers = [
            { email: 'juan@ejemplo.com', phone: '+593981234567', firstName: 'Juan', lastName: 'Pérez' },
            { email: 'maria@ejemplo.com', phone: '+593982345678', firstName: 'María', lastName: 'González' },
            { email: 'carlos@ejemplo.com', phone: '+593983456789', firstName: 'Carlos', lastName: 'Rodríguez' },
            { email: 'ana@ejemplo.com', phone: '+593984567890', firstName: 'Ana', lastName: 'Martínez' },
            { email: 'pedro@ejemplo.com', phone: '+593985678901', firstName: 'Pedro', lastName: 'López' },
        ];

        for (const passengerData of passengers) {
            const user = await this.prisma.user.create({
                data: {
                    ...passengerData,
                    passwordHash,
                    role: UserRole.PASSENGER,
                    profilePicture: `https://ui-avatars.com/api/?name=${passengerData.firstName}+${passengerData.lastName}&background=random`,
                    passenger: {
                        create: {},
                    },
                    wallet: {
                        create: {
                            balance: this.randomDecimal(10, 100),
                        },
                    },
                },
            });

            // Crear ubicaciones favoritas para cada pasajero
            await this.createFavoriteLocations(user.id);
        }

        // Crear usuarios conductores
        const drivers = [
            { email: 'daniel@ejemplo.com', phone: '+593986789012', firstName: 'Daniel', lastName: 'Hernández', license: 'L-12345', vehicle: { plate: 'ABC-1234', make: 'Toyota', model: 'Corolla', year: 2018, color: 'Blanco' } },
            { email: 'laura@ejemplo.com', phone: '+593987890123', firstName: 'Laura', lastName: 'Díaz', license: 'L-23456', vehicle: { plate: 'DEF-5678', make: 'Honda', model: 'Civic', year: 2019, color: 'Azul' } },
            { email: 'roberto@ejemplo.com', phone: '+593988901234', firstName: 'Roberto', lastName: 'Sánchez', license: 'L-34567', vehicle: { plate: 'GHI-9012', make: 'Nissan', model: 'Sentra', year: 2020, color: 'Rojo' } },
        ];

        for (const driverData of drivers) {
            const { email, phone, firstName, lastName, license, vehicle } = driverData;

            const user = await this.prisma.user.create({
                data: {
                    email,
                    phone,
                    firstName,
                    lastName,
                    passwordHash,
                    role: UserRole.DRIVER,
                    profilePicture: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`,
                    driver: {
                        create: {
                            licenseNumber: license,
                            licenseExpiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
                            verificationStatus: VerificationStatus.VERIFIED,
                            backgroundCheckStatus: VerificationStatus.VERIFIED,
                            isAvailable: true,
                            currentLocation: {
                                latitude: -0.18 + (Math.random() * 0.05 - 0.025),
                                longitude: -78.48 + (Math.random() * 0.05 - 0.025),
                            },
                            vehicle: {
                                create: {
                                    plate: vehicle.plate,
                                    make: vehicle.make,
                                    model: vehicle.model,
                                    year: vehicle.year,
                                    color: vehicle.color,
                                    capacity: 4,
                                    category: VehicleCategory.STANDARD,
                                    insuranceStatus: VerificationStatus.VERIFIED,
                                    photoUrl: `https://via.placeholder.com/300x200?text=${vehicle.make}+${vehicle.model}`,
                                },
                            },
                        },
                    },
                    wallet: {
                        create: {
                            balance: this.randomDecimal(50, 200),
                        },
                    },
                },
            });
        }

        // Crear usuario administrador
        await this.prisma.user.create({
            data: {
                email: 'admin@ejemplo.com',
                phone: '+593989012345',
                firstName: 'Admin',
                lastName: 'User',
                passwordHash,
                role: UserRole.ADMIN,
                profilePicture: 'https://ui-avatars.com/api/?name=Admin+User&background=random',
                wallet: {
                    create: {
                        balance: 1000,
                    },
                },
            },
        });

        this.logger.log('Usuarios creados exitosamente');
    }

    /**
     * Crea vehículos para conductores existentes
     */
    async seedVehicles() {
        // Este método no es necesario ya que creamos los vehículos junto con los conductores
        this.logger.log('Vehículos ya creados junto con los conductores');
    }

    /**
     * Crea configuraciones de tarifas
     */
    async seedTariffConfigs() {
        this.logger.log('Creando configuraciones de tarifas...');

        const tariffs = [
            {
                name: 'Estándar',
                basePrice: 1.5,
                pricePerKm: 0.4,
                pricePerMinute: 0.15,
                minimumPrice: 2.5,
                cancelFee: 2.0,
                vehicleCategory: VehicleCategory.STANDARD,
                applyTripType: TripType.ON_DEMAND,
                platformFeePercentage: 20,
            },
            {
                name: 'Premium',
                basePrice: 2.5,
                pricePerKm: 0.6,
                pricePerMinute: 0.25,
                minimumPrice: 4.0,
                cancelFee: 3.0,
                vehicleCategory: VehicleCategory.PREMIUM,
                applyTripType: TripType.ON_DEMAND,
                platformFeePercentage: 15,
            },
            {
                name: 'Women Only',
                basePrice: 2.0,
                pricePerKm: 0.5,
                pricePerMinute: 0.2,
                minimumPrice: 3.0,
                cancelFee: 2.5,
                vehicleCategory: VehicleCategory.WOMEN_ONLY,
                applyTripType: TripType.ON_DEMAND,
                platformFeePercentage: 18,
            },
            {
                name: 'Intercity Standard',
                basePrice: 5.0,
                pricePerKm: 0.3,
                pricePerMinute: 0.05,
                minimumPrice: 10.0,
                cancelFee: 5.0,
                vehicleCategory: VehicleCategory.STANDARD,
                applyTripType: TripType.INTERCITY,
                platformFeePercentage: 12,
            },
        ];

        for (const tariff of tariffs) {
            await this.prisma.tariffConfig.create({
                data: tariff,
            });
        }

        this.logger.log('Configuraciones de tarifas creadas exitosamente');
    }

    /**
     * Crea viajes de prueba
     */
    async seedTrips() {
        this.logger.log('Creando viajes...');

        // Obtener usuarios pasajeros
        const passengers = await this.prisma.user.findMany({
            where: { role: UserRole.PASSENGER },
            include: { passenger: true },
        });

        // Obtener usuarios conductores
        const drivers = await this.prisma.user.findMany({
            where: { role: UserRole.DRIVER },
            include: { driver: true },
        });

        // Obtener tarifa estándar
        const tariff = await this.prisma.tariffConfig.findFirst({
            where: {
                name: 'Estándar',
            },
        });

        if (!tariff) {
            this.logger.error('No se encontró la tarifa estándar');
            return;
        }

        // Crear varios viajes
        const tripsCount = 15;

        for (let i = 0; i < tripsCount; i++) {
            // Seleccionar pasajero y conductor aleatorios
            const passenger = passengers[Math.floor(Math.random() * passengers.length)];
            const driver = drivers[Math.floor(Math.random() * drivers.length)];

            // Crear ubicaciones aleatorias en Quito
            const startLocation = {
                latitude: -0.18 + (Math.random() * 0.05 - 0.025),
                longitude: -78.48 + (Math.random() * 0.05 - 0.025),
                address: {
                    street: `Calle ${Math.floor(Math.random() * 100) + 1}`,
                    city: 'Quito',
                    state: 'Pichincha',
                    country: 'Ecuador',
                },
            };

            const endLocation = {
                latitude: -0.18 + (Math.random() * 0.05 - 0.025),
                longitude: -78.48 + (Math.random() * 0.05 - 0.025),
                address: {
                    street: `Calle ${Math.floor(Math.random() * 100) + 1}`,
                    city: 'Quito',
                    state: 'Pichincha',
                    country: 'Ecuador',
                },
            };

            // Calcular distancia y duración aleatorias
            const distance = this.randomDecimal(2, 15); // km
            const duration = Math.floor(distance * 4); // minutos

            // Calcular tarifa
            const fare = this.calculateFare(distance, duration, tariff);

            // Fechas aleatorias en el último mes
            const currentDate = new Date();
            const randomDaysAgo = Math.floor(Math.random() * 30) + 1;
            const tripDate = new Date(currentDate.getTime() - randomDaysAgo * 24 * 60 * 60 * 1000);

            // Determinar el estado del viaje (diferente distribución para generar viajes en todos los estados)
            let status;
            const randomStatus = Math.random();
            if (randomStatus < 0.7) {
                status = TripStatus.COMPLETED;
            } else if (randomStatus < 0.8) {
                status = TripStatus.IN_PROGRESS;
            } else if (randomStatus < 0.9) {
                status = TripStatus.CONFIRMED;
            } else {
                status = TripStatus.CANCELLED;
            }

            // Crear el viaje
            const trip = await this.prisma.trip.create({
                data: {
                    type: TripType.ON_DEMAND,
                    driverId: driver.driver.id,
                    status,
                    startLocation,
                    endLocation,
                    distance,
                    duration,
                    fare,
                    estimatedFare: fare,
                    routePolyline: 'mock_polyline_string', // Simulado
                    startedAt: status !== TripStatus.CANCELLED ? tripDate : null,
                    endedAt: status === TripStatus.COMPLETED ? new Date(tripDate.getTime() + duration * 60 * 1000) : null,
                    cancellationReason: status === TripStatus.CANCELLED ? 'El pasajero canceló el viaje' : null,
                    createdAt: tripDate,
                },
            });

            // Añadir pasajero al viaje
            await this.prisma.tripPassenger.create({
                data: {
                    tripId: trip.id,
                    passengerId: passenger.id,
                    fare,
                    status,
                },
            });
        }

        // Crear algunos viajes interprovinciales
        const intercityTripsCount = 5;

        for (let i = 0; i < intercityTripsCount; i++) {
            // Seleccionar pasajero y conductor aleatorios
            const passenger = passengers[Math.floor(Math.random() * passengers.length)];
            const driver = drivers[Math.floor(Math.random() * drivers.length)];

            // Crear ubicaciones aleatorias para viajes interprovinciales
            const cities = [
                { name: 'Quito', lat: -0.18, lng: -78.48 },
                { name: 'Guayaquil', lat: -2.19, lng: -79.88 },
                { name: 'Cuenca', lat: -2.90, lng: -79.00 },
                { name: 'Ambato', lat: -1.24, lng: -78.62 },
            ];

            const originIndex = Math.floor(Math.random() * cities.length);
            let destinationIndex;
            do {
                destinationIndex = Math.floor(Math.random() * cities.length);
            } while (destinationIndex === originIndex);

            const origin = cities[originIndex];
            const destination = cities[destinationIndex];

            // Calcular distancia y duración aproximadas
            const distance = this.randomDecimal(50, 300); // km
            const duration = Math.floor(distance * (3 + Math.random())); // minutos

            // Precio por asiento
            const pricePerSeat = Math.floor(distance * 0.15 * 100) / 100;
            const availableSeats = Math.floor(Math.random() * 3) + 1; // 1-3 asientos disponibles

            // Fechas aleatorias en la próxima semana
            const currentDate = new Date();
            const randomDaysAhead = Math.floor(Math.random() * 7) + 1;
            const tripDate = new Date(currentDate.getTime() + randomDaysAhead * 24 * 60 * 60 * 1000);
            tripDate.setHours(Math.floor(Math.random() * 12) + 6, 0, 0, 0); // Entre 6 AM y 6 PM

            // Crear el viaje interprovincial
            const trip = await this.prisma.trip.create({
                data: {
                    type: TripType.INTERCITY,
                    driverId: driver.driver.id,
                    status: TripStatus.SCHEDULED,
                    startLocation: {
                        latitude: origin.lat,
                        longitude: origin.lng,
                        address: {
                            city: origin.name,
                            state: 'Ecuador',
                        },
                    },
                    endLocation: {
                        latitude: destination.lat,
                        longitude: destination.lng,
                        address: {
                            city: destination.name,
                            state: 'Ecuador',
                        },
                    },
                    distance,
                    duration,
                    fare: pricePerSeat * availableSeats,
                    estimatedFare: pricePerSeat * availableSeats,
                    scheduledAt: tripDate,
                    origin: origin.name,
                    destination: destination.name,
                    availableSeats,
                    pricePerSeat,
                },
            });

            // Añadir pasajero al viaje
            await this.prisma.tripPassenger.create({
                data: {
                    tripId: trip.id,
                    passengerId: passenger.id,
                    fare: pricePerSeat,
                    status: TripStatus.SCHEDULED,
                    bookedSeats: 1,
                },
            });
        }

        this.logger.log('Viajes creados exitosamente');
    }

    /**
     * Crea pagos para viajes completados
     */
    async seedPayments() {
        this.logger.log('Creando pagos...');

        // Obtener viajes completados
        const completedTrips = await this.prisma.trip.findMany({
            where: { status: TripStatus.COMPLETED },
            include: {
                passengers: true,
                driver: true,
            },
        });

        for (const trip of completedTrips) {
            // Definir método de pago aleatorio
            const methods = [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.WALLET];
            const method = methods[Math.floor(Math.random() * methods.length)];

            // Definir comisiones
            const platformFeePercentage = 0.2; // 20%
            const platformFee = Number(trip.fare) * platformFeePercentage;
            const driverAmount = Number(trip.fare) - platformFee;
            const taxAmount = Number(trip.fare) * 0.12; // 12% IVA

            // Crear pago
            await this.prisma.payment.create({
                data: {
                    tripId: trip.id,
                    userId: trip.passengers[0].passengerId,
                    amount: trip.fare,
                    method,
                    status: PaymentStatus.COMPLETED,
                    platformFee,
                    driverAmount,
                    taxAmount,
                    transactionId: `TX-${Math.floor(Math.random() * 1000000)}`,
                    receiptUrl: `https://ejemplo.com/receipts/${trip.id}`,
                    createdAt: trip.endedAt,
                    updatedAt: trip.endedAt,
                },
            });
        }

        this.logger.log('Pagos creados exitosamente');
    }

    /**
     * Crea calificaciones para viajes completados
     */
    async seedRatings() {
        this.logger.log('Creando calificaciones...');

        // Obtener viajes completados con relaciones
        const completedTrips = await this.prisma.trip.findMany({
            where: { status: TripStatus.COMPLETED },
            include: {
                passengers: {
                    include: {
                        passenger: true,
                    },
                },
                driver: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        for (const trip of completedTrips) {
            if (!trip.driver) continue;

            const passengerId = trip.passengers[0].passengerId;
            const driverId = trip.driver.userId;

            // Calificación del pasajero al conductor (80% de probabilidad)
            if (Math.random() < 0.8) {
                const passengerRating = Math.floor(Math.random() * 2) + 4; // 4-5 estrellas

                await this.prisma.rating.create({
                    data: {
                        tripId: trip.id,
                        fromUserId: passengerId,
                        toUserId: driverId,
                        score: passengerRating,
                        comment: passengerRating === 5 ? 'Excelente servicio, muy amable.' : 'Buen servicio.',
                        createdAt: new Date(trip.endedAt.getTime() + 5 * 60 * 1000), // 5 minutos después
                    },
                });
            }

            // Calificación del conductor al pasajero (70% de probabilidad)
            if (Math.random() < 0.7) {
                const driverRating = Math.floor(Math.random() * 2) + 4; // 4-5 estrellas

                await this.prisma.rating.create({
                    data: {
                        tripId: trip.id,
                        fromUserId: driverId,
                        toUserId: passengerId,
                        score: driverRating,
                        comment: driverRating === 5 ? 'Excelente pasajero.' : 'Buen pasajero.',
                        createdAt: new Date(trip.endedAt.getTime() + 10 * 60 * 1000), // 10 minutos después
                    },
                });
            }
        }

        this.logger.log('Calificaciones creadas exitosamente');
    }

    /**
     * Crea transacciones de monedero para usuarios
     */
    async seedWalletTransactions() {
        this.logger.log('Creando transacciones de monedero...');

        // Obtener monederos
        const wallets = await this.prisma.wallet.findMany({
            include: {
                user: true,
            },
        });

        for (const wallet of wallets) {
            // Crear entre 1 y 5 depósitos por usuario
            const depositsCount = Math.floor(Math.random() * 5) + 1;

            for (let i = 0; i < depositsCount; i++) {
                const amount = this.randomDecimal(10, 50);
                const currentDate = new Date();
                const randomDaysAgo = Math.floor(Math.random() * 30) + 1;
                const transactionDate = new Date(currentDate.getTime() - randomDaysAgo * 24 * 60 * 60 * 1000);

                await this.prisma.walletTransaction.create({
                    data: {
                        walletId: wallet.id,
                        amount,
                        balanceAfter: amount, // Simplificado, no refleja el saldo real acumulativo
                        type: TransactionType.DEPOSIT,
                        description: 'Depósito a monedero',
                        status: TransactionStatus.COMPLETED,
                        createdAt: transactionDate,
                    },
                });
            }

            // Para conductores, crear transacciones de ganancias
            if (wallet.user.role === UserRole.DRIVER) {
                const earningsCount = Math.floor(Math.random() * 10) + 5;

                for (let i = 0; i < earningsCount; i++) {
                    const amount = this.randomDecimal(5, 20);
                    const currentDate = new Date();
                    const randomDaysAgo = Math.floor(Math.random() * 30) + 1;
                    const transactionDate = new Date(currentDate.getTime() - randomDaysAgo * 24 * 60 * 60 * 1000);

                    await this.prisma.walletTransaction.create({
                        data: {
                            walletId: wallet.id,
                            amount,
                            balanceAfter: amount, // Simplificado
                            type: TransactionType.TRIP_EARNING,
                            description: `Ganancia por viaje #${Math.floor(Math.random() * 1000)}`,
                            status: TransactionStatus.COMPLETED,
                            createdAt: transactionDate,
                        },
                    });
                }
            }
        }

        this.logger.log('Transacciones de monedero creadas exitosamente');
    }

    /**
     * Crea códigos promocionales
     */
    async seedPromoCodes() {
        this.logger.log('Creando códigos promocionales...');

        const promoCodes = [
            {
                code: 'BIENVENIDO',
                description: 'Código de bienvenida para nuevos usuarios',
                discountAmount: 3.00,
                maxDiscount: 3.00,
                startDate: new Date(),
                endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
                usageLimit: 1000,
                applicableTripTypes: [TripType.ON_DEMAND],
            },
            {
                code: 'VIERNES',
                description: '15% de descuento en viajes los viernes',
                discountPercent: 15.00,
                maxDiscount: 5.00,
                startDate: new Date(),
                endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
                minTripAmount: 5.00,
                applicableTripTypes: [TripType.ON_DEMAND],
            },
            {
                code: 'INTERCITY25',
                description: '25% de descuento en viajes interprovinciales',
                discountPercent: 25.00,
                maxDiscount: 10.00,
                startDate: new Date(),
                endDate: new Date(new Date().setMonth(new Date().getMonth() + 2)),
                applicableTripTypes: [TripType.INTERCITY],
            },
        ];

        for (const promoCode of promoCodes) {
            await this.prisma.promoCode.create({
                data: promoCode,
            });
        }

        this.logger.log('Códigos promocionales creados exitosamente');
    }

    /**
     * Crea ubicaciones favoritas para un pasajero
     */
    private async createFavoriteLocations(userId: string) {
        const passenger = await this.prisma.passenger.findUnique({
            where: { userId },
        });

        if (!passenger) {
            this.logger.error(`No se encontró el perfil de pasajero para el usuario ${userId}`);
            return;
        }

        // Ubicación casa
        await this.prisma.location.create({
            data: {
                passengerId: passenger.id,
                name: 'Casa',
                address: 'Av. República y Eloy Alfaro',
                latitude: -0.182,
                longitude: -78.485,
                isHome: true,
            },
        });

        // Ubicación trabajo
        await this.prisma.location.create({
            data: {
                passengerId: passenger.id,
                name: 'Trabajo',
                address: 'Av. 12 de Octubre y Cordero',
                latitude: -0.198,
                longitude: -78.493,
                isWork: true,
            },
        });

        // Ubicación adicional
        await this.prisma.location.create({
            data: {
                passengerId: passenger.id,
                name: 'Supermercado',
                address: 'Av. 6 de Diciembre y Granados',
                latitude: -0.175,
                longitude: -78.477,
            },
        });
    }

    /**
     * Calcula la tarifa en base a distancia, duración y configuración de tarifa
     */
    private calculateFare(distance: number, duration: number, tariff: any): number {
        const distanceCost = distance * tariff.pricePerKm;
        const timeCost = duration * tariff.pricePerMinute;
        let fare = tariff.basePrice + distanceCost + timeCost;

        // Asegurar tarifa mínima
        if (fare < tariff.minimumPrice) {
            fare = tariff.minimumPrice;
        }

        // Redondear a 2 decimales
        return Math.round(fare * 100) / 100;
    }

    /**
     * Genera un número decimal aleatorio entre min y max con 2 decimales
     */
    private randomDecimal(min: number, max: number): number {
        return Math.round((Math.random() * (max - min) + min) * 100) / 100;
    }
}