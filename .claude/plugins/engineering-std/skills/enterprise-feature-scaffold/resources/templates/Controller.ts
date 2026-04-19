import { Request, Response, NextFunction } from 'express';
import { {{Entity}}Service } from './{{Entity}}Service';

/**
 * {{Entity}}Controller — Presentation Layer
 *
 * Handles HTTP request/response concerns only.
 * All business logic is delegated to {{Entity}}Service via constructor injection.
 */
export class {{Entity}}Controller {
  constructor(private readonly {{entity}}Service: {{Entity}}Service) {}

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const items = await this.{{entity}}Service.findAll();
      res.json(items);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const item = await this.{{entity}}Service.findById(req.params.id);
      if (!item) {
        res.status(404).json({ message: '{{Entity}} not found' });
        return;
      }
      res.json(item);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const created = await this.{{entity}}Service.create(req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await this.{{entity}}Service.update(req.params.id, req.body);
      if (!updated) {
        res.status(404).json({ message: '{{Entity}} not found' });
        return;
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.{{entity}}Service.delete(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
