import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindFirst = vi.fn();
const mockInsertReturning = vi.fn();
const mockUpdateWhere = vi.fn();
const mockUpdateSet = vi.fn();
const mockUpdate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("../packages/core/src/db/client", () => ({
  db: {
    query: {
      emailEvents: {
        findFirst: mockFindFirst,
      },
    },
    transaction: mockTransaction,
  },
}));

describe("packages/core emailEventRepo.create", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockUpdateWhere.mockResolvedValue(undefined);
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdate.mockReturnValue({ set: mockUpdateSet });

    mockTransaction.mockImplementation(async (callback) =>
      callback({
        insert: () => ({
          values: () => ({
            returning: mockInsertReturning,
          }),
        }),
        update: mockUpdate,
      }),
    );
  });

  it("updates the parent email status when a delivered event is recorded", async () => {
    const event = {
      id: "evt_1",
      emailId: "email_1",
      type: "delivered",
      payload: { smtpResponse: "250 ok" },
    };
    mockInsertReturning.mockResolvedValue([event]);

    const { emailEventRepo } = await import(
      "../packages/core/src/db/repositories/emailEventRepo"
    );

    const result = await emailEventRepo.create(event);

    expect(result).toEqual(event);
    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockUpdateSet).toHaveBeenCalledWith({ status: "delivered" });
    expect(mockUpdateWhere).toHaveBeenCalledOnce();
  });

  it("does not update the parent email status for non-terminal events", async () => {
    const event = {
      id: "evt_2",
      emailId: "email_1",
      type: "opened",
      payload: { ipAddress: "127.0.0.1" },
    };
    mockInsertReturning.mockResolvedValue([event]);

    const { emailEventRepo } = await import(
      "../packages/core/src/db/repositories/emailEventRepo"
    );

    const result = await emailEventRepo.create(event);

    expect(result).toEqual(event);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
