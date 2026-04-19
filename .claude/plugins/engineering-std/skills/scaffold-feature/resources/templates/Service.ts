import { {{Entity}}Repository } from './{{Entity}}Repository';

export interface {{Entity}}CreateDto {
  // TODO: define create payload fields
  [key: string]: unknown;
}

export interface {{Entity}}UpdateDto {
  // TODO: define update payload fields
  [key: string]: unknown;
}

export class {{Entity}}Service {
  constructor(private readonly {{entity}}Repository: {{Entity}}Repository) {}

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
