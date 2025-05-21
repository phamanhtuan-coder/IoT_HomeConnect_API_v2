import { PrismaClient } from '@prisma/client';
import { ErrorCodes, throwError } from '../utils/errors';
import { ProductionComponent, ProductionComponentInput } from '../types/production-components';

class ProductionComponentsService {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async createProductionComponent(input: ProductionComponentInput): Promise<ProductionComponent> {
        const { production_id, component_id, quantity_used } = input;

        // Verify production record exists
        const production = await this.prisma.production_tracking.findUnique({
            where: { production_id, is_deleted: false },
        });
        if (!production) throwError(ErrorCodes.PRODUCTION_NOT_FOUND, 'Production record not found');

        // Verify component exists and has sufficient quantity
        const component = await this.prisma.components.findUnique({
            where: { component_id, is_deleted: false },
        });
        if (!component) throwError(ErrorCodes.COMPONENT_NOT_FOUND, 'Component not found');

        const currentStock = component!.quantity_in_stock ?? 0;
        if (currentStock < quantity_used) {
            throwError(ErrorCodes.INSUFFICIENT_QUANTITY, 'Insufficient component quantity available');
        }

        // Create production component
        const productionComponent = await this.prisma.production_components.create({
            data: {
                production_id,
                component_id,
                quantity_used,
                created_at: new Date(),
                updated_at: new Date(),
            },
        });

        // Update component quantity
        await this.prisma.components.update({
            where: { component_id },
            data: {
                quantity_in_stock: currentStock - quantity_used
            },
        });

        return this.mapPrismaProductionComponentToAuthProductionComponent(productionComponent);
    }

    async getProductionComponentById(productionComponentId: number): Promise<ProductionComponent> {
        const productionComponent = await this.prisma.production_components.findUnique({
            where: { production_component_id: productionComponentId, is_deleted: false },
        });
        if (!productionComponent) {
            throwError(ErrorCodes.NOT_FOUND, 'Production component not found');
        }
        return this.mapPrismaProductionComponentToAuthProductionComponent(productionComponent);
    }

    async getProductionComponentsByProductionId(productionId: number): Promise<ProductionComponent[]> {
        const productionComponents = await this.prisma.production_components.findMany({
            where: { production_id: productionId, is_deleted: false },
        });
        return productionComponents.map((pc) => this.mapPrismaProductionComponentToAuthProductionComponent(pc));
    }

    async updateProductionComponent(
        productionComponentId: number,
        input: Partial<ProductionComponent>
    ): Promise<ProductionComponent> {
        const productionComponent = await this.prisma.production_components.findUnique({
            where: { production_component_id: productionComponentId, is_deleted: false },
        });
        if (!productionComponent) {
            throwError(ErrorCodes.NOT_FOUND, 'Production component not found');
        }

        const updatedProductionComponent = await this.prisma.production_components.update({
            where: { production_component_id: productionComponentId },
            data: {
                ...input,
                updated_at: new Date(),
            },
        });

        return this.mapPrismaProductionComponentToAuthProductionComponent(updatedProductionComponent);
    }

    async deleteProductionComponent(productionComponentId: number): Promise<void> {
        const productionComponent = await this.prisma.production_components.findUnique({
            where: { production_component_id: productionComponentId, is_deleted: false },
        });
        if (!productionComponent) {
            throwError(ErrorCodes.NOT_FOUND, 'Production component not found');
        }

        await this.prisma.production_components.update({
            where: { production_component_id: productionComponentId },
            data: {
                is_deleted: true,
                updated_at: new Date(),
            },
        });
    }

    private mapPrismaProductionComponentToAuthProductionComponent(pc: any): ProductionComponent {
        return {
            production_component_id: pc.production_component_id,
            production_id: pc.production_id,
            component_id: pc.component_id,
            quantity_used: pc.quantity_used,
            created_at: pc.created_at,
            updated_at: pc.updated_at,
            is_deleted: pc.is_deleted,
        };
    }
}

export default ProductionComponentsService;


