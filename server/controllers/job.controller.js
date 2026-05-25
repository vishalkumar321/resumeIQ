import * as JobService from "../services/job.service.js";

/**
 * Job Controller
 * Orchestrates job matching requests and response handling.
 */

export const matchJob = async (req, res, next) => {
  try {
    const { resumeId, jobDescription, jobTitle, jobSource } = req.body;
    const userId = req.user.id; // From auth middleware

    // 1. Create or ensure job exists
    // For now, we'll create a new 'job' record for every match request to track history uniquely.
    // In a future version, we could check for duplicates.
    const job = await JobService.createJob(
      userId,
      jobTitle || "Untitled Job Match",
      jobDescription,
      jobSource || "manual"
    );

    // 2. Process match via AI
    const result = await JobService.processJobMatch(
      userId,
      resumeId,
      job.id,
      jobDescription
    );

    return res.status(200).json({
      success: true,
      message: "Job match analysis completed successfully",
      data: {
        jobId: job.id,
        ...result
      }
    });
  } catch (error) {
    console.error("[JOB_CONTROLLER] Error:", error.message);
    next(error);
  }
};

export const getMatches = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const matches = await JobService.getUserMatches(userId);

    return res.status(200).json({
      success: true,
      data: matches
    });
  } catch (error) {
    next(error);
  }
};

export const getJobDetails = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = await JobService.getJobById(jobId);

    return res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    next(error);
  }
};
