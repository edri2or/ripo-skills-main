import { I{{Entity}}Repository } from './I{{Entity}}Repository';

export interface {{Entity}}CreateDto {
  // TODO: define create payload fields
  [key: string]: unknown;
}

export interface {{Entity}}UpdateDto {
  // TODO: define update payload fields
  [key: string]: unknown;
}

/**
 * {{Entity}}Service — Application Layer
 *
 * Orchestrates business logic for the {{Entity}} domain.
 * Depends on I{{Entity}}Repository interface (not the concrete implementation)
 * to maintain the Dependency Rule (outer layers must not be referenced inward).
 */
export class {{Entity}}Service {
  constructor(private readonly {{entity}}Repository: I{{Entity}}Repository) {}

  async findAll(): Promise<unknown[]> {
    return this.{{entity}}Repository.findAll();
  }

  async findById(id: string): Promise<unknown | null> {
    return this.{{entity}}Repository.findById(id);
  }

  async create(dto: {{Entity}}CreateDto): Promise<unknown> {
    return this.{{entity}}Repository.create(dto);
  }

  async update(id: string, dto: {{Entity}}UpdateDto): Promise<unknown | null> {
    return this.{{entity}}Repository.update(id, dto);
  }

  async delete(id: string): Promise<void> {
    return this.{{entity}}Repository.delete(id);
  }
}
